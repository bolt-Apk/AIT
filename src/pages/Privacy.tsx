import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="h-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-10 pt-[max(2.5rem,calc(var(--sat)+1rem))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400 hover:text-cyan-500 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Политика конфиденциальности</h1>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Последнее обновление: 20 апреля 2026 г.</p>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-slate-600 dark:text-gray-300">
          <section>
            <h2 className="text-base font-semibold text-slate-800 dark:text-gray-100 mb-3">1. Общие положения</h2>
            <p>
              Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки
              и защиты персональных данных пользователей сервиса AI-taip.com (далее — «Сервис»),
              предоставляемого Индивидуальным предпринимателем (ОГРНИП 326930100026381, ИНН 614065786992).
            </p>
            <p className="mt-2">
              Используя Сервис, вы соглашаетесь с условиями настоящей Политики. Если вы не согласны
              с каким-либо из положений, пожалуйста, воздержитесь от использования Сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 dark:text-gray-100 mb-3">2. Какие данные мы собираем</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Адрес электронной почты — для создания и аутентификации учётной записи.</li>
              <li>Данные об использовании Сервиса — история генераций (текст, изображения, видео, аудио), выбранные модели и параметры.</li>
              <li>Платёжные данные — информация о пополнении баланса; обработка платежей осуществляется через сторонние платёжные системы, мы не храним данные банковских карт.</li>
              <li>Техническая информация — IP-адрес, тип браузера, тип устройства, собираемые автоматически для обеспечения работоспособности Сервиса.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 dark:text-gray-100 mb-3">3. Цели обработки данных</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Предоставление доступа к функциям Сервиса.</li>
              <li>Идентификация пользователя и управление учётной записью.</li>
              <li>Обработка платежей и ведение истории транзакций.</li>
              <li>Улучшение качества Сервиса и устранение технических проблем.</li>
              <li>Выполнение требований законодательства Российской Федерации.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 dark:text-gray-100 mb-3">4. Хранение и защита данных</h2>
            <p>
              Персональные данные хранятся на защищённых серверах с использованием шифрования.
              Мы принимаем организационные и технические меры для защиты данных от несанкционированного
              доступа, изменения, раскрытия или уничтожения.
            </p>
            <p className="mt-2">
              Данные хранятся в течение всего срока использования Сервиса. При удалении учётной записи
              персональные данные удаляются в течение 30 дней, за исключением случаев, предусмотренных
              законодательством.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 dark:text-gray-100 mb-3">5. Передача данных третьим лицам</h2>
            <p>
              Мы не продаём и не передаём персональные данные третьим лицам, за исключением случаев:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Обработка платежей через партнёрские платёжные системы.</li>
              <li>Использование сторонних API для выполнения генерации контента (текстовые запросы передаются без привязки к личности пользователя).</li>
              <li>Выполнение требований законодательства по запросу уполномоченных органов.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 dark:text-gray-100 mb-3">6. Права пользователя</h2>
            <p>Вы имеете право:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Запрашивать информацию о хранящихся персональных данных.</li>
              <li>Требовать исправления неточных данных.</li>
              <li>Требовать удаления персональных данных и учётной записи.</li>
              <li>Отозвать согласие на обработку персональных данных.</li>
            </ul>
            <p className="mt-2">
              Для реализации указанных прав свяжитесь с нами по электронной почте, указанной на сайте.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 dark:text-gray-100 mb-3">7. Файлы cookie</h2>
            <p>
              Сервис использует файлы cookie и локальное хранилище браузера для поддержания сессии
              авторизации и сохранения пользовательских настроек. Отключение cookie может привести
              к ограничению функциональности Сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-800 dark:text-gray-100 mb-3">8. Изменение Политики</h2>
            <p>
              Мы оставляем за собой право обновлять настоящую Политику. Актуальная версия всегда
              доступна на данной странице. Продолжая использовать Сервис после внесения изменений,
              вы принимаете обновлённые условия.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-200/40 dark:border-gray-800/40">
            <p className="text-xs text-slate-400 dark:text-gray-500">
              ИП, ОГРНИП 326930100026381, ИНН 614065786992
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
