import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "tr" | "es" | "de" | "fr" | "ru" | "zh-CN";

const STORAGE_KEY = "aetherwidgets-language";
const DEFAULT_LANGUAGE: Language = "en";

const SUPPORTED_LANGUAGES: Language[] = ["en", "tr", "es", "de", "fr", "ru", "zh-CN"];

export const LANGUAGE_OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "ru", label: "Русский" },
  { code: "zh-CN", label: "简体中文" },
];

interface TranslationTree {
  controlPanel: {
    title: string;
    subtitle: string;
    language: string;
    settings: string;
    launchAtStartup: string;
    minimizeToTray: string;
    exit: string;
  };
  widgetContextMenu: {
    closeWidget: string;
    pin: string;
    unpin: string;
    cancel: string;
  };
  widgets: {
    clock: {
      name: string;
      description: string;
      stopwatch: string;
      start: string;
      pause: string;
      reset: string;
      backToClock: string;
    };
    weather: {
      name: string;
      description: string;
      loading: string;
      error: string;
      searchPlaceholder: string;
      currentLocation: string;
      useSystemLocation: string;
      locationPermissionNeeded: string;
      searchNoResults: string;
    };
    system: {
      name: string;
      description: string;
      loading: string;
      taskManager: string;
      cpu: string;
      ram: string;
      disk: string;
      uptime: string;
    };
    calendar: {
      name: string;
      description: string;
    };
    notes: {
      name: string;
      description: string;
      title: string;
      noNotes: string;
      pending: string;
      total: string;
      newNotePlaceholder: string;
      markIncomplete: string;
      markComplete: string;
      pin: string;
      unpin: string;
    };
    pomodoro: {
      name: string;
      description: string;
      work: string;
      shortBreak: string;
      longBreak: string;
      custom: string;
      start: string;
      pause: string;
      reset: string;
      total: string;
      sessions: string;
    };
    crypto: {
      name: string;
      description: string;
      title: string;
      settings: string;
      refreshNow: string;
      dataSource: string;
      trackedCoins: string;
      amount: string;
      buyPrice: string;
      pnl: string;
      instantPnl: string;
      updateFailed: string;
      loading: string;
    };
  };
  weather: {
    descriptions: Record<number, string>;
  };
  languages: {
    english: string;
    turkish: string;
    spanish: string;
    german: string;
    french: string;
    russian: string;
    chineseSimplified: string;
  };
}

const EN_TRANSLATIONS: TranslationTree = {
  controlPanel: {
    title: "AetherWidgets",
    subtitle: "Manage widgets",
    language: "Language",
    settings: "Settings",
    launchAtStartup: "Launch at startup",
    minimizeToTray: "Minimize to tray",
    exit: "Exit",
  },
  widgetContextMenu: {
    closeWidget: "Close widget",
    pin: "Always on top",
    unpin: "Unpin from top",
    cancel: "Cancel",
  },
  widgets: {
    clock: {
      name: "Clock",
      description: "Digital clock and date",
      stopwatch: "Stopwatch",
      start: "Start",
      pause: "Pause",
      reset: "Reset",
      backToClock: "Clock",
    },
    weather: {
      name: "Weather",
      description: "Current weather",
      loading: "Loading...",
      error: "Weather could not be loaded",
      searchPlaceholder: "Search city or district...",
      currentLocation: "Current location",
      useSystemLocation: "Use current location",
      locationPermissionNeeded: "Allow location access to use your current city.",
      searchNoResults: "No results found",
    },
    system: {
      name: "System Monitor",
      description: "CPU and RAM usage",
      loading: "Loading...",
      taskManager: "Task Manager",
      cpu: "CPU",
      ram: "RAM",
      disk: "Disk",
      uptime: "Uptime",
    },
    calendar: {
      name: "Calendar",
      description: "Monthly calendar view",
    },
    notes: {
      name: "Notes",
      description: "Quick note taking",
      title: "Notes",
      noNotes: "No notes yet",
      pending: "pending",
      total: "total",
      newNotePlaceholder: "New note...",
      markIncomplete: "Mark as incomplete",
      markComplete: "Mark as complete",
      pin: "Always on top",
      unpin: "Unpin from top",
    },
    pomodoro: {
      name: "Pomodoro",
      description: "Focus timer",
      work: "Work",
      shortBreak: "Short Break",
      longBreak: "Long Break",
      custom: "Custom",
      start: "Start",
      pause: "Pause",
      reset: "Reset",
      total: "Total",
      sessions: "sessions",
    },
    crypto: {
      name: "Crypto",
      description: "Cryptocurrency prices",
      title: "Crypto",
      settings: "Settings",
      refreshNow: "Refresh now",
      dataSource: "Data source",
      trackedCoins: "Tracked coins",
      amount: "Amount",
      buyPrice: "Buy $",
      pnl: "P/L",
      instantPnl: "Instant profit/loss",
      updateFailed: "Prices could not be updated",
      loading: "Loading...",
    },
  },
  weather: {
    descriptions: {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Drizzle",
      55: "Dense drizzle",
      61: "Light rain",
      63: "Rain",
      65: "Heavy rain",
      71: "Light snow",
      73: "Snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Light rain showers",
      81: "Rain showers",
      82: "Heavy rain showers",
      85: "Light snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with hail",
      99: "Severe hailstorm",
    },
  },
  languages: {
    english: "English",
    turkish: "Turkish",
    spanish: "Spanish",
    german: "German",
    french: "French",
    russian: "Russian",
    chineseSimplified: "Simplified Chinese",
  },
};
type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? PartialDeep<T[K]> : T[K];
};

const TRANSLATIONS: Record<Language, PartialDeep<TranslationTree>> = {
  en: EN_TRANSLATIONS,
  tr: {
    controlPanel: {
      subtitle: "Widget'ları yönetin",
      language: "Dil",
      settings: "Ayarlar",
      launchAtStartup: "Başlangıçta çalıştır",
      minimizeToTray: "Sistem tepsisine küçült",
      exit: "Çıkış",
    },
    widgetContextMenu: {
      closeWidget: "Widget'ı kapat",
      pin: "Her zaman üstte",
      unpin: "Üstten kaldır",
      cancel: "Vazgeç",
    },
    widgets: {
      clock: {
        name: "Saat",
        description: "Dijital saat ve tarih",
        stopwatch: "Kronometre",
        start: "Başlat",
        pause: "Duraklat",
        reset: "Sıfırla",
        backToClock: "Saat",
      },
      weather: {
        name: "Hava Durumu",
        description: "Güncel hava durumu",
        loading: "Yükleniyor...",
        error: "Hava durumu yüklenemedi",
        searchPlaceholder: "Şehir veya ilçe ara...",
        currentLocation: "Mevcut konum",
        useSystemLocation: "Sistem konumunu kullan",
        searchNoResults: "Sonuç bulunamadı",
      },
      system: {
        name: "Sistem Monitörü",
        description: "CPU ve RAM kullanımı",
        loading: "Yükleniyor...",
        taskManager: "Görev Yöneticisi",
        cpu: "CPU",
        ram: "RAM",
        disk: "Disk",
        uptime: "Çalışma süresi",
      },
      calendar: {
        name: "Takvim",
        description: "Aylık takvim görünümü",
      },
      notes: {
        name: "Notlar",
        description: "Hızlı not alma",
        title: "Notlar",
        noNotes: "Henüz not yok",
        pending: "bekleyen",
        total: "toplam",
        newNotePlaceholder: "Yeni not...",
        markIncomplete: "Tamamlanmadı olarak işaretle",
        markComplete: "Tamamlandı olarak işaretle",
        pin: "Her zaman üstte",
        unpin: "Üstten kaldır",
      },
      pomodoro: {
        name: "Pomodoro",
        description: "Odaklanma zamanlayıcısı",
        work: "Çalışma",
        shortBreak: "Kısa Mola",
        longBreak: "Uzun Mola",
        custom: "Özel",
        start: "Başlat",
        pause: "Duraklat",
        reset: "Sıfırla",
        total: "Toplam",
        sessions: "oturum",
      },
      crypto: {
        name: "Kripto",
        description: "Kripto para fiyatları",
        title: "Kripto",
        settings: "Ayarlar",
        refreshNow: "Şimdi yenile",
        dataSource: "Veri Kaynağı",
        trackedCoins: "İzlenen Coinler",
        amount: "Miktar",
        buyPrice: "Alış $",
        pnl: "K/Z",
        instantPnl: "Anlık kâr/zarar",
        updateFailed: "Fiyatlar güncellenemedi",
        loading: "Yükleniyor...",
      },
    },
    weather: {
      descriptions: {
        0: "Açık",
        1: "Az bulutlu",
        2: "Parçalı bulutlu",
        3: "Kapalı",
        45: "Sisli",
        48: "Sisli",
        51: "Hafif çisenti",
        53: "Çisenti",
        55: "Yoğun çisenti",
        61: "Hafif yağmur",
        63: "Yağmur",
        65: "Şiddetli yağmur",
        71: "Hafif kar",
        73: "Kar",
        75: "Yoğun kar",
        77: "Kar taneleri",
        80: "Hafif sağanak",
        81: "Sağanak",
        82: "Şiddetli sağanak",
        85: "Hafif kar sağanağı",
        86: "Yoğun kar sağanağı",
        95: "Gök gürültülü",
        96: "Dolu ile gök gürültülü",
        99: "Şiddetli dolu",
      },
    },
    languages: {
      english: "İngilizce",
      turkish: "Türkçe",
      spanish: "İspanyolca",
      german: "Almanca",
      french: "Fransızca",
      russian: "Rusça",
      chineseSimplified: "Basitleştirilmiş Çince",
    },
  },
  es: {
    controlPanel: {
      subtitle: "Administrar widgets",
      language: "Idioma",
      settings: "Ajustes",
      launchAtStartup: "Iniciar al arrancar el sistema",
      minimizeToTray: "Minimizar a la bandeja",
      exit: "Salir",
    },
    widgetContextMenu: {
      closeWidget: "Cerrar widget",
      pin: "Siempre encima",
      unpin: "Quitar de encima",
      cancel: "Cancelar",
    },
    widgets: {
      clock: {
        name: "Reloj",
        description: "Reloj y fecha digital",
        stopwatch: "Cronómetro",
        start: "Iniciar",
        pause: "Pausa",
        reset: "Restablecer",
        backToClock: "Reloj",
      },
      weather: {
        name: "Tiempo",
        description: "Tiempo actual",
        loading: "Cargando...",
        error: "No se pudo cargar el tiempo",
        searchPlaceholder: "Buscar ciudad o distrito...",
      },
      system: {
        name: "Monitor del sistema",
        description: "Uso de CPU y RAM",
        loading: "Cargando...",
        taskManager: "Administrador de tareas",
        cpu: "CPU",
        ram: "RAM",
        disk: "Disco",
        uptime: "Tiempo activo",
      },
      calendar: {
        name: "Calendario",
        description: "Vista mensual del calendario",
      },
      notes: {
        name: "Notas",
        description: "Notas rápidas",
        title: "Notas",
        noNotes: "Aún no hay notas",
        pending: "pendientes",
        total: "total",
        newNotePlaceholder: "Nueva nota...",
        markIncomplete: "Marcar como incompleta",
        markComplete: "Marcar como completa",
        pin: "Siempre encima",
        unpin: "Quitar de encima",
      },
      pomodoro: {
        name: "Pomodoro",
        description: "Temporizador de enfoque",
        work: "Trabajo",
        shortBreak: "Descanso corto",
        longBreak: "Descanso largo",
        custom: "Personalizado",
        start: "Iniciar",
        pause: "Pausa",
        reset: "Restablecer",
        total: "Total",
        sessions: "sesiones",
      },
      crypto: {
        name: "Cripto",
        description: "Precios de criptomonedas",
        title: "Cripto",
        settings: "Configuración",
        refreshNow: "Actualizar ahora",
        dataSource: "Fuente de datos",
        trackedCoins: "Monedas seguidas",
        amount: "Cantidad",
        buyPrice: "Compra $",
        pnl: "G/P",
        instantPnl: "Ganancia/pérdida instantánea",
        updateFailed: "No se pudieron actualizar los precios",
        loading: "Cargando...",
      },
    },
    languages: {
      english: "Inglés",
      turkish: "Turco",
      spanish: "Español",
      german: "Alemán",
      french: "Francés",
      russian: "Ruso",
      chineseSimplified: "Chino simplificado",
    },
  },
  de: {
    controlPanel: {
      subtitle: "Widgets verwalten",
      language: "Sprache",
      settings: "Einstellungen",
      launchAtStartup: "Beim Systemstart ausführen",
      minimizeToTray: "In den Infobereich minimieren",
      exit: "Beenden",
    },
    widgetContextMenu: {
      closeWidget: "Widget schließen",
      pin: "Immer im Vordergrund",
      unpin: "Vordergrund verlassen",
      cancel: "Abbrechen",
    },
    widgets: {
      clock: {
        name: "Uhr",
        description: "Digitale Uhr und Datum",
        stopwatch: "Stoppuhr",
        start: "Start",
        pause: "Pause",
        reset: "Zurücksetzen",
        backToClock: "Uhr",
      },
      weather: {
        name: "Wetter",
        description: "Aktuelles Wetter",
        loading: "Wird geladen...",
        error: "Wetter konnte nicht geladen werden",
        searchPlaceholder: "Stadt oder Bezirk suchen...",
      },
      system: {
        name: "Systemmonitor",
        description: "CPU- und RAM-Auslastung",
        loading: "Wird geladen...",
        taskManager: "Task-Manager",
        cpu: "CPU",
        ram: "RAM",
        disk: "Festplatte",
        uptime: "Laufzeit",
      },
      calendar: {
        name: "Kalender",
        description: "Monatsansicht des Kalenders",
      },
      notes: {
        name: "Notizen",
        description: "Schnelle Notizen",
        title: "Notizen",
        noNotes: "Noch keine Notizen",
        pending: "offen",
        total: "gesamt",
        newNotePlaceholder: "Neue Notiz...",
        markIncomplete: "Als unerledigt markieren",
        markComplete: "Als erledigt markieren",
        pin: "Immer im Vordergrund",
        unpin: "Vordergrund verlassen",
      },
      pomodoro: {
        name: "Pomodoro",
        description: "Fokus-Timer",
        work: "Arbeit",
        shortBreak: "Kurze Pause",
        longBreak: "Lange Pause",
        custom: "Benutzerdefiniert",
        start: "Start",
        pause: "Pause",
        reset: "Zurücksetzen",
        total: "Gesamt",
        sessions: "Sitzungen",
      },
      crypto: {
        name: "Krypto",
        description: "Kryptowährungspreise",
        title: "Krypto",
        settings: "Einstellungen",
        refreshNow: "Jetzt aktualisieren",
        dataSource: "Datenquelle",
        trackedCoins: "Verfolgte Coins",
        amount: "Menge",
        buyPrice: "Kauf $",
        pnl: "G/V",
        instantPnl: "Sofortiger Gewinn/Verlust",
        updateFailed: "Preise konnten nicht aktualisiert werden",
        loading: "Wird geladen...",
      },
    },
    languages: {
      english: "Englisch",
      turkish: "Türkisch",
      spanish: "Spanisch",
      german: "Deutsch",
      french: "Französisch",
      russian: "Russisch",
      chineseSimplified: "Vereinfachtes Chinesisch",
    },
  },
  fr: {
    controlPanel: {
      subtitle: "Gérer les widgets",
      language: "Langue",
      settings: "Paramètres",
      launchAtStartup: "Lancer au démarrage",
      minimizeToTray: "Réduire dans la barre d’état",
      exit: "Quitter",
    },
    widgetContextMenu: {
      closeWidget: "Fermer le widget",
      pin: "Toujours au premier plan",
      unpin: "Retirer du premier plan",
      cancel: "Annuler",
    },
    widgets: {
      clock: {
        name: "Horloge",
        description: "Horloge et date numériques",
        stopwatch: "Chronomètre",
        start: "Démarrer",
        pause: "Pause",
        reset: "Réinitialiser",
        backToClock: "Horloge",
      },
      weather: {
        name: "Météo",
        description: "Météo actuelle",
        loading: "Chargement...",
        error: "La météo n'a pas pu être chargée",
        searchPlaceholder: "Rechercher une ville ou un district...",
      },
      system: {
        name: "Moniteur système",
        description: "Utilisation CPU et RAM",
        loading: "Chargement...",
        taskManager: "Gestionnaire des tâches",
        cpu: "CPU",
        ram: "RAM",
        disk: "Disque",
        uptime: "Temps de fonctionnement",
      },
      calendar: {
        name: "Calendrier",
        description: "Vue mensuelle du calendrier",
      },
      notes: {
        name: "Notes",
        description: "Prise de notes rapide",
        title: "Notes",
        noNotes: "Aucune note pour le moment",
        pending: "en attente",
        total: "total",
        newNotePlaceholder: "Nouvelle note...",
        markIncomplete: "Marquer comme incomplète",
        markComplete: "Marquer comme complète",
        pin: "Toujours au premier plan",
        unpin: "Retirer du premier plan",
      },
      pomodoro: {
        name: "Pomodoro",
        description: "Minuteur de concentration",
        work: "Travail",
        shortBreak: "Pause courte",
        longBreak: "Pause longue",
        custom: "Personnalisé",
        start: "Démarrer",
        pause: "Pause",
        reset: "Réinitialiser",
        total: "Total",
        sessions: "sessions",
      },
      crypto: {
        name: "Crypto",
        description: "Prix des cryptomonnaies",
        title: "Crypto",
        settings: "Paramètres",
        refreshNow: "Actualiser maintenant",
        dataSource: "Source de données",
        trackedCoins: "Cryptos suivies",
        amount: "Montant",
        buyPrice: "Achat $",
        pnl: "P/L",
        instantPnl: "Gain/perte instantané",
        updateFailed: "Les prix n'ont pas pu être mis à jour",
        loading: "Chargement...",
      },
    },
    languages: {
      english: "Anglais",
      turkish: "Turc",
      spanish: "Espagnol",
      german: "Allemand",
      french: "Français",
      russian: "Russe",
      chineseSimplified: "Chinois simplifié",
    },
  },
  ru: {
    controlPanel: {
      subtitle: "Управление виджетами",
      language: "Язык",
      settings: "Настройки",
      launchAtStartup: "Запускать при старте системы",
      minimizeToTray: "Свернуть в трей",
      exit: "Выход",
    },
    widgetContextMenu: {
      closeWidget: "Закрыть виджет",
      pin: "Всегда поверх",
      unpin: "Убрать с переднего плана",
      cancel: "Отмена",
    },
    widgets: {
      clock: {
        name: "Часы",
        description: "Цифровые часы и дата",
        stopwatch: "Секундомер",
        start: "Старт",
        pause: "Пауза",
        reset: "Сброс",
        backToClock: "Часы",
      },
      weather: {
        name: "Погода",
        description: "Текущая погода",
        loading: "Загрузка...",
        error: "Не удалось загрузить погоду",
        searchPlaceholder: "Поиск города или района...",
      },
      system: {
        name: "Системный монитор",
        description: "Использование CPU и RAM",
        loading: "Загрузка...",
        taskManager: "Диспетчер задач",
        cpu: "CPU",
        ram: "RAM",
        disk: "Диск",
        uptime: "Время работы",
      },
      calendar: {
        name: "Календарь",
        description: "Месячный вид календаря",
      },
      notes: {
        name: "Заметки",
        description: "Быстрые заметки",
        title: "Заметки",
        noNotes: "Пока нет заметок",
        pending: "в ожидании",
        total: "всего",
        newNotePlaceholder: "Новая заметка...",
        markIncomplete: "Отметить как незавершённую",
        markComplete: "Отметить как завершённую",
        pin: "Всегда поверх",
        unpin: "Убрать с переднего плана",
      },
      pomodoro: {
        name: "Помодоро",
        description: "Таймер фокуса",
        work: "Работа",
        shortBreak: "Короткий перерыв",
        longBreak: "Длинный перерыв",
        custom: "Пользовательский",
        start: "Старт",
        pause: "Пауза",
        reset: "Сброс",
        total: "Всего",
        sessions: "сеансов",
      },
      crypto: {
        name: "Крипто",
        description: "Курсы криптовалют",
        title: "Крипто",
        settings: "Настройки",
        refreshNow: "Обновить сейчас",
        dataSource: "Источник данных",
        trackedCoins: "Отслеживаемые монеты",
        amount: "Количество",
        buyPrice: "Покупка $",
        pnl: "П/У",
        instantPnl: "Мгновенная прибыль/убыток",
        updateFailed: "Не удалось обновить цены",
        loading: "Загрузка...",
      },
    },
    languages: {
      english: "Английский",
      turkish: "Турецкий",
      spanish: "Испанский",
      german: "Немецкий",
      french: "Французский",
      russian: "Русский",
      chineseSimplified: "Упрощённый китайский",
    },
  },
  "zh-CN": {
    controlPanel: {
      subtitle: "管理小组件",
      language: "语言",
      settings: "设置",
      launchAtStartup: "开机时启动",
      minimizeToTray: "最小化到托盘",
      exit: "退出",
    },
    widgetContextMenu: {
      closeWidget: "关闭小组件",
      pin: "始终置顶",
      unpin: "取消置顶",
      cancel: "取消",
    },
    widgets: {
      clock: {
        name: "时钟",
        description: "数字时钟和日期",
        stopwatch: "秒表",
        start: "开始",
        pause: "暂停",
        reset: "重置",
        backToClock: "时钟",
      },
      weather: {
        name: "天气",
        description: "当前天气",
        loading: "加载中...",
        error: "天气无法加载",
        searchPlaceholder: "搜索城市或区域...",
      },
      system: {
        name: "系统监视器",
        description: "CPU 和 RAM 使用率",
        loading: "加载中...",
        taskManager: "任务管理器",
        cpu: "CPU",
        ram: "RAM",
        disk: "磁盘",
        uptime: "运行时间",
      },
      calendar: {
        name: "日历",
        description: "月历视图",
      },
      notes: {
        name: "便笺",
        description: "快速记笔记",
        title: "便笺",
        noNotes: "暂无便笺",
        pending: "待办",
        total: "总计",
        newNotePlaceholder: "新便笺...",
        markIncomplete: "标记为未完成",
        markComplete: "标记为已完成",
        pin: "始终置顶",
        unpin: "取消置顶",
      },
      pomodoro: {
        name: "番茄钟",
        description: "专注计时器",
        work: "工作",
        shortBreak: "短休息",
        longBreak: "长休息",
        custom: "自定义",
        start: "开始",
        pause: "暂停",
        reset: "重置",
        total: "总计",
        sessions: "次会话",
      },
      crypto: {
        name: "加密货币",
        description: "加密货币价格",
        title: "加密货币",
        settings: "设置",
        refreshNow: "立即刷新",
        dataSource: "数据源",
        trackedCoins: "追踪币种",
        amount: "数量",
        buyPrice: "买入价 $",
        pnl: "盈亏",
        instantPnl: "即时盈亏",
        updateFailed: "价格无法更新",
        loading: "加载中...",
      },
    },
    languages: {
      english: "英语",
      turkish: "土耳其语",
      spanish: "西班牙语",
      german: "德语",
      french: "法语",
      russian: "俄语",
      chineseSimplified: "简体中文",
    },
  },
};

function getNestedValue(root: unknown, path: string): string | undefined {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, root) as string | undefined;
}

function readStoredLanguage(): Language {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && SUPPORTED_LANGUAGES.includes(raw as Language)) {
      return raw as Language;
    }
  } catch {
    // Ignore storage failures and fall back to default.
  }
  return DEFAULT_LANGUAGE;
}

function getLocale(language: Language) {
  switch (language) {
    case "tr":
      return "tr-TR";
    case "es":
      return "es-ES";
    case "de":
      return "de-DE";
    case "fr":
      return "fr-FR";
    case "ru":
      return "ru-RU";
    case "zh-CN":
      return "zh-CN";
    case "en":
    default:
      return "en-US";
  }
}

function createTranslator(language: Language) {
  const tree = TRANSLATIONS[language];
  return (path: string) =>
    getNestedValue(tree, path) ?? getNestedValue(EN_TRANSLATIONS, path) ?? path;
}

function getWeekdayLabels(language: Language) {
  const locale = getLocale(language);
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 1 + index)),
  );
}

function getWeatherDescriptions(language: Language) {
  return (TRANSLATIONS[language].weather?.descriptions ??
    EN_TRANSLATIONS.weather.descriptions) as Record<number, string>;
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (path: string) => string;
  locale: string;
  weekdayLabels: string[];
  weatherDescriptions: Record<number, string>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignore storage failures.
    }
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue && SUPPORTED_LANGUAGES.includes(event.newValue as Language)) {
        setLanguage(event.newValue as Language);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: createTranslator(language),
      locale: getLocale(language),
      weekdayLabels: getWeekdayLabels(language),
      weatherDescriptions: getWeatherDescriptions(language),
    }),
    [language],
  );

  return createElement(LanguageContext.Provider, { value }, children);
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export { getLocale };
