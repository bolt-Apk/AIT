import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminRow } = await adminClient
      .from("admin_users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminRow) return json({ error: "Forbidden" }, 403);

    const url = new URL(req.url);
    let action = url.searchParams.get("action");

    // Support POST body actions too
    let bodyData: Record<string, unknown> = {};
    if (req.method === "POST") {
      try {
        bodyData = await req.json();
        if (bodyData.action && typeof bodyData.action === "string") {
          action = bodyData.action;
        }
      } catch { /* no body */ }
    }

    if (action === "stats") {
      return json(await getStats(adminClient));
    }

    if (action === "users") {
      return json(await getUsers(adminClient));
    }

    if (action === "update_balance" && req.method === "POST") {
      const userId = bodyData.userId as string;
      const amount = bodyData.amount as number;
      if (!userId || amount === undefined) return json({ error: "Missing userId or amount" }, 400);
      return json(await updateBalance(adminClient, userId, amount));
    }

    if (action === "delete_user" && req.method === "POST") {
      const userId = bodyData.userId as string;
      if (!userId) return json({ error: "Missing userId" }, 400);
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) return json({ error: "Failed to delete user" }, 500);
      return json({ success: true });
    }

    if (action === "ban_user" && req.method === "POST") {
      const userId = bodyData.userId as string;
      const reason = bodyData.reason as string;
      if (!userId) return json({ error: "Missing userId" }, 400);
      const { error } = await adminClient
        .from("user_balances")
        .update({
          banned_at: new Date().toISOString(),
          ban_reason: reason || "Нарушение правил",
        })
        .eq("id", userId);
      if (error) return json({ error: "Failed to ban user" }, 500);
      return json({ success: true });
    }

    if (action === "unban_user" && req.method === "POST") {
      const userId = bodyData.userId as string;
      if (!userId) return json({ error: "Missing userId" }, 400);
      const { error } = await adminClient
        .from("user_balances")
        .update({ banned_at: null, ban_reason: null })
        .eq("id", userId);
      if (error) return json({ error: "Failed to unban user" }, 500);
      return json({ success: true });
    }

    if (action === "user_generations") {
      const userId = (url.searchParams.get("userId") || bodyData.userId) as string;
      if (!userId) return json({ error: "Missing userId" }, 400);
      return json(await getUserGenerations(adminClient, userId));
    }

    if (action === "presence") {
      return json(await getPresence(adminClient));
    }

    // Support chat actions
    if (action === "get_support_tickets") {
      const { data } = await adminClient
        .from("support_tickets")
        .select("*")
        .order("last_message_at", { ascending: false });
      // Enrich with user emails
      const tickets = data || [];
      if (tickets.length > 0) {
        const userIds = [...new Set(tickets.map((t: { user_id: string }) => t.user_id))];
        const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const emailMap = new Map((authUsers || []).map((u: { id: string; email?: string }) => [u.id, u.email]));
        for (const t of tickets) {
          (t as Record<string, unknown>).user_email = emailMap.get(t.user_id) || null;
        }
      }
      return json({ tickets });
    }

    if (action === "get_support_messages") {
      const ticketId = bodyData.ticket_id as string;
      if (!ticketId) return json({ error: "Missing ticket_id" }, 400);
      const { data } = await adminClient
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      return json({ messages: data || [] });
    }

    if (action === "send_support_message") {
      const ticketId = bodyData.ticket_id as string;
      const content = bodyData.content as string | null;
      const mediaUrl = bodyData.media_url as string | null;
      const mediaType = (bodyData.media_type as string) || "text";
      if (!ticketId) return json({ error: "Missing ticket_id" }, 400);
      const { error } = await adminClient.from("support_messages").insert({
        ticket_id: ticketId,
        sender: "admin",
        content,
        media_url: mediaUrl,
        media_type: mediaType,
      });
      if (error) return json({ error: "Failed to send" }, 500);
      await adminClient.from("support_tickets").update({
        last_message_at: new Date().toISOString(),
      }).eq("id", ticketId);
      await adminClient.rpc("increment_support_unread_user", { p_ticket_id: ticketId });
      return json({ success: true });
    }

    if (action === "mark_ticket_read") {
      const ticketId = bodyData.ticket_id as string;
      if (!ticketId) return json({ error: "Missing ticket_id" }, 400);
      await adminClient.from("support_tickets").update({ unread_admin: 0 }).eq("id", ticketId);
      return json({ success: true });
    }

    if (action === "get_support_unread") {
      const { data } = await adminClient
        .from("support_tickets")
        .select("unread_admin");
      const total = (data || []).reduce((s: number, t: { unread_admin: number }) => s + t.unread_admin, 0);
      return json({ unread: total });
    }

    if (action === "top_up_user_balance") {
      const userId = bodyData.user_id as string;
      const amount = bodyData.amount as number;
      if (!userId || typeof amount !== "number" || amount <= 0) return json({ error: "Missing user_id or invalid amount" }, 400);
      const { error } = await adminClient.rpc("add_tokens", { p_user_id: userId, p_amount: amount });
      if (error) return json({ error: "Failed to top up: " + error.message }, 500);
      return json({ success: true });
    }

    if (action === "delete_support_ticket") {
      const ticketId = bodyData.ticket_id as string;
      if (!ticketId) return json({ error: "Missing ticket_id" }, 400);
      await adminClient.from("support_messages").delete().eq("ticket_id", ticketId);
      await adminClient.from("support_tickets").delete().eq("id", ticketId);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: "Internal server error" }, 500);
  }
});

async function getStats(client: ReturnType<typeof createClient>) {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const yesterdayStart = new Date(Date.now() - 86400000);
  yesterdayStart.setHours(0, 0, 0, 0);
  const ydayStart = yesterdayStart.toISOString();
  const ydayEnd = todayStart;

  const [
    balancesRes,
    generationsRes,
    paymentsRes,
    referralsRes,
    chatsRes,
    ttsRes,
    videosRes,
    imagesRes,
    pendingRes,
    revenueRes,
    totalTokensRes,
    todayUsersRes,
    todayGenRes,
    todayImagesRes,
    todayChatsRes,
    todayTtsRes,
    todayVideosRes,
    todayPaymentsRes,
    todayReferralsRes,
    ydayUsersRes,
    ydayGenRes,
    ydayImagesRes,
    ydayChatsRes,
    ydayTtsRes,
    ydayVideosRes,
    ydayPaymentsRes,
    ydayReferralsRes,
  ] = await Promise.all([
    client.from("user_balances").select("*", { count: "exact", head: true }),
    client.from("generation_results").select("*", { count: "exact", head: true }),
    client.from("payments").select("*", { count: "exact", head: true }),
    client.from("referrals").select("*", { count: "exact", head: true }),
    client.from("chat_sessions").select("*", { count: "exact", head: true }),
    client.from("tts_history").select("*", { count: "exact", head: true }),
    client.from("video_history").select("*", { count: "exact", head: true }),
    client.from("image_history").select("*", { count: "exact", head: true }),
    client.from("pending_generations").select("*", { count: "exact", head: true }),
    client.from("payments").select("amount").eq("status", "succeeded"),
    client.from("user_balances").select("tokens"),
    client.from("user_balances").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    client.from("generation_results").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    client.from("image_history").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    client.from("chat_sessions").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    client.from("tts_history").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    client.from("video_history").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    client.from("payments").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    client.from("referrals").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    client.from("user_balances").select("*", { count: "exact", head: true }).gte("created_at", ydayStart).lt("created_at", ydayEnd),
    client.from("generation_results").select("*", { count: "exact", head: true }).gte("created_at", ydayStart).lt("created_at", ydayEnd),
    client.from("image_history").select("*", { count: "exact", head: true }).gte("created_at", ydayStart).lt("created_at", ydayEnd),
    client.from("chat_sessions").select("*", { count: "exact", head: true }).gte("created_at", ydayStart).lt("created_at", ydayEnd),
    client.from("tts_history").select("*", { count: "exact", head: true }).gte("created_at", ydayStart).lt("created_at", ydayEnd),
    client.from("video_history").select("*", { count: "exact", head: true }).gte("created_at", ydayStart).lt("created_at", ydayEnd),
    client.from("payments").select("*", { count: "exact", head: true }).gte("created_at", ydayStart).lt("created_at", ydayEnd),
    client.from("referrals").select("*", { count: "exact", head: true }).gte("created_at", ydayStart).lt("created_at", ydayEnd),
  ]);

  const totalRevenue = (revenueRes.data || []).reduce(
    (sum: number, p: { amount: number }) => sum + Number(p.amount), 0
  );
  const totalTokensInSystem = (totalTokensRes.data || []).reduce(
    (sum: number, b: { tokens: number }) => sum + Number(b.tokens), 0
  );

  return {
    totalUsers: balancesRes.count || 0,
    totalGenerations: generationsRes.count || 0,
    totalPayments: paymentsRes.count || 0,
    totalReferrals: referralsRes.count || 0,
    totalChats: chatsRes.count || 0,
    totalTTS: ttsRes.count || 0,
    totalVideos: videosRes.count || 0,
    totalImages: imagesRes.count || 0,
    totalPending: pendingRes.count || 0,
    totalRevenue,
    totalTokensInSystem,
    newUsersToday: todayUsersRes.count || 0,
    today: {
      users: todayUsersRes.count || 0,
      generations: todayGenRes.count || 0,
      images: todayImagesRes.count || 0,
      chats: todayChatsRes.count || 0,
      tts: todayTtsRes.count || 0,
      videos: todayVideosRes.count || 0,
      payments: todayPaymentsRes.count || 0,
      referrals: todayReferralsRes.count || 0,
    },
    yesterday: {
      users: ydayUsersRes.count || 0,
      generations: ydayGenRes.count || 0,
      images: ydayImagesRes.count || 0,
      chats: ydayChatsRes.count || 0,
      tts: ydayTtsRes.count || 0,
      videos: ydayVideosRes.count || 0,
      payments: ydayPaymentsRes.count || 0,
      referrals: ydayReferralsRes.count || 0,
    },
  };
}

async function getUsers(client: ReturnType<typeof createClient>) {
  const { data: authUsers, error } = await client.auth.admin.listUsers({
    perPage: 1000,
  });

  if (error || !authUsers) return [];

  const [
    { data: balances },
    { data: imageCounts },
    { data: chatCounts },
    { data: ttsCounts },
    { data: videoCounts },
    { data: presenceData },
  ] = await Promise.all([
    client.from("user_balances").select("*"),
    client.from("image_history").select("user_id"),
    client.from("chat_sessions").select("user_id"),
    client.from("tts_history").select("user_id"),
    client.from("video_history").select("user_id"),
    client.from("user_presence").select("*"),
  ]);

  const balanceMap = new Map(
    (balances || []).map((b: any) => [b.id, b])
  );
  const presenceMap = new Map(
    (presenceData || []).map((p: any) => [p.user_id, p])
  );

  const countByUser = (rows: { user_id: string }[] | null, uid: string) =>
    (rows || []).filter((r) => r.user_id === uid).length;

  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  return authUsers.users.map((u) => {
    const balance = balanceMap.get(u.id) as any;
    const presence = presenceMap.get(u.id) as any;
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      tokens: balance ? Number(balance.tokens) : 0,
      referral_code: balance?.referral_code || "",
      total_referral_earnings: balance ? Number(balance.total_referral_earnings) : 0,
      imageCount: countByUser(imageCounts, u.id),
      chatCount: countByUser(chatCounts, u.id),
      ttsCount: countByUser(ttsCounts, u.id),
      videoCount: countByUser(videoCounts, u.id),
      banned_at: balance?.banned_at || null,
      ban_reason: balance?.ban_reason || null,
      is_online: presence ? presence.last_seen > twoMinAgo : false,
      device_type: presence?.device_type || null,
      last_seen: presence?.last_seen || null,
    };
  });
}

async function updateBalance(
  client: ReturnType<typeof createClient>,
  userId: string,
  amount: number
) {
  if (typeof amount !== "number" || amount < 0 || amount > 1000000) {
    return { error: "Invalid amount" };
  }
  const { data, error } = await client
    .from("user_balances")
    .update({ tokens: amount, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("tokens")
    .maybeSingle();

  if (error) return { error: "Failed to update balance" };
  return { success: true, tokens: data?.tokens };
}

async function getUserGenerations(
  client: ReturnType<typeof createClient>,
  userId: string
) {
  const [
    { data: images },
    { data: videos },
    { data: chats },
    { data: tts },
  ] = await Promise.all([
    client
      .from("image_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("video_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("tts_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return {
    images: images || [],
    videos: videos || [],
    chats: chats || [],
    tts: tts || [],
  };
}

async function getPresence(client: ReturnType<typeof createClient>) {
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data } = await client
    .from("user_presence")
    .select("*")
    .gte("last_seen", twoMinAgo)
    .order("last_seen", { ascending: false });

  return data || [];
}
