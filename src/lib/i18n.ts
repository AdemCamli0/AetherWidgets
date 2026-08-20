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
    theme: string;
    themeDark: string;
    themeLight: string;
    snapToGrid: string;
    settings: string;
    launchAtStartup: string;
    minimizeToTray: string;
    exit: string;
    notifications: string;
    notificationSound: string;
    notificationSoundChime: string;
    notificationSoundAlarm: string;
    notificationSoundNone: string;
    notificationDuration: string;
    notificationDurationSeconds: string;
    notificationRepeat: string;
    display: string;
    themeAuto: string;
    fontSize: string;
    fontSizeSmall: string;
    fontSizeNormal: string;
    fontSizeLarge: string;
    animations: string;
    animationsNone: string;
    animationsNormal: string;
    animationsFull: string;
    accentColor: string;
    accentDefault: string;
    layouts: string;
  };
  layoutManager: {
    title: string;
    templates: string;
    templateDefault: string;
    templateDefaultDesc: string;
    templateCompact: string;
    templateCompactDesc: string;
    templateMinimal: string;
    templateMinimalDesc: string;
    apply: string;
    saveCurrent: string;
    namePlaceholder: string;
    save: string;
    customLayouts: string;
    delete: string;
    importExport: string;
    export: string;
    import: string;
    applied: string;
    saved: string;
    exported: string;
    imported: string;
    nameRequired: string;
    error: string;
  };
  widgetContextMenu: {
    closeWidget: string;
    pin: string;
    unpin: string;
    resize: string;
    style: string;
    cancel: string;
  };
  widgetStyle: {
    title: string;
    accentColor: string;
    accentDefault: string;
    cornerRadius: string;
    radiusSharp: string;
    radiusNormal: string;
    radiusRound: string;
    opacity: string;
    opacityDefault: string;
    blur: string;
    reset: string;
  };
  widgetSizeEditor: {
    title: string;
    width: string;
    height: string;
    limits: string;
    apply: string;
    resetDefault: string;
    invalidError: string;
    applyError: string;
    loadError: string;
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
      worldClocks: string;
      alarm: string;
      alarmTitle: string;
      alarmBody: string;
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
      hourly: string;
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
      uptimeHours: string;
      uptimeMinutes: string;
    };
    calendar: {
      name: string;
      description: string;
      events: string;
      addEvent: string;
      eventPlaceholder: string;
      noEvents: string;
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
      dueDate: string;
      overdue: string;
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
      notifications: string;
      autoNext: string;
      workDuration: string;
      workDone: string;
      workDoneBody: string;
      breakDone: string;
      breakDoneBody: string;
      timerDone: string;
      timerDoneBody: string;
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
      alerts: string;
      alertAbove: string;
      alertBelow: string;
      alertTitle: string;
      alertAboveBody: string;
      alertBelowBody: string;
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
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    snapToGrid: "Snap to grid",
    settings: "Settings",
    launchAtStartup: "Launch at startup",
    minimizeToTray: "Minimize to tray",
    exit: "Exit",
    notifications: "Notifications",
    notificationSound: "Alert sound",
    notificationSoundChime: "Chime",
    notificationSoundAlarm: "Alarm",
    notificationSoundNone: "None",
    notificationDuration: "Sound duration",
    notificationDurationSeconds: "{seconds}s",
    notificationRepeat: "Repeat until dismissed",
    display: "Display",
    themeAuto: "Auto",
    fontSize: "Font size",
    fontSizeSmall: "Small",
    fontSizeNormal: "Normal",
    fontSizeLarge: "Large",
    animations: "Animations",
    animationsNone: "None",
    animationsNormal: "Normal",
    animationsFull: "Full",
    accentColor: "Accent color",
    accentDefault: "Default",
    layouts: "Layouts",
  },
  layoutManager: {
    title: "Layouts",
    templates: "Templates",
    templateDefault: "Default",
    templateDefaultDesc: "Three columns, right side of the screen",
    templateCompact: "Compact",
    templateCompactDesc: "Two columns, minimum sizes",
    templateMinimal: "Minimal",
    templateMinimalDesc: "Floating rows, centered",
    apply: "Apply",
    saveCurrent: "Save current arrangement",
    namePlaceholder: "Layout name...",
    save: "Save",
    customLayouts: "Custom layouts",
    delete: "Delete",
    importExport: "Import / Export",
    export: "Export JSON",
    import: "Import JSON",
    applied: "Layout applied.",
    saved: "Layout saved.",
    exported: "Layout exported.",
    imported: "Layout imported and applied.",
    nameRequired: "Enter a name for the layout.",
    error: "The layout action failed.",
  },
  widgetContextMenu: {
    closeWidget: "Close widget",
    pin: "Always on top",
    unpin: "Unpin from top",
    resize: "Resize",
    style: "Style",
    cancel: "Cancel",
  },
  widgetStyle: {
    title: "Widget style",
    accentColor: "Accent color",
    accentDefault: "Default",
    cornerRadius: "Corner radius",
    radiusSharp: "Sharp",
    radiusNormal: "Normal",
    radiusRound: "Round",
    opacity: "Background opacity",
    opacityDefault: "Default",
    blur: "Background blur",
    reset: "Reset style",
  },
  widgetSizeEditor: {
    title: "Widget size",
    width: "Width",
    height: "Height",
    limits: "Limits: {minW}–{maxW} × {minH}–{maxH} px",
    apply: "Apply",
    resetDefault: "Reset to default",
    invalidError: "Enter valid width and height values.",
    applyError: "Could not apply the size.",
    loadError: "Could not load size limits.",
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
      worldClocks: "World clocks",
      alarm: "Alarm",
      alarmTitle: "Alarm",
      alarmBody: "It's time!",
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
      hourly: "Next 24 hours",
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
      uptimeHours: "h",
      uptimeMinutes: "m",
    },
    calendar: {
      name: "Calendar",
      description: "Monthly calendar view",
      events: "Events",
      addEvent: "Add event",
      eventPlaceholder: "Event title...",
      noEvents: "No events",
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
      dueDate: "Due date",
      overdue: "Overdue",
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
      notifications: "Notifications",
      autoNext: "Auto next",
      workDuration: "Work duration",
      workDone: "Work session complete",
      workDoneBody: "Time for a break",
      breakDone: "Break is over",
      breakDoneBody: "Back to work",
      timerDone: "Timer complete",
      timerDoneBody: "Time's up",
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
      alerts: "Price alerts",
      alertAbove: "Above",
      alertBelow: "Below",
      alertTitle: "{symbol} price alert",
      alertAboveBody: "{symbol} is above ${price}",
      alertBelowBody: "{symbol} is below ${price}",
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
      theme: "Tema",
      themeDark: "Koyu",
      themeLight: "Açık",
      snapToGrid: "Izgaraya hizala",
      settings: "Ayarlar",
      launchAtStartup: "Başlangıçta çalıştır",
      minimizeToTray: "Sistem tepsisine küçült",
      exit: "Çıkış",
      notifications: "Bildirimler",
      notificationSound: "Uyarı sesi",
      notificationSoundChime: "Zil",
      notificationSoundAlarm: "Alarm",
      notificationSoundNone: "Yok",
      notificationDuration: "Ses süresi",
      notificationDurationSeconds: "{seconds} sn",
      notificationRepeat: "Kapatılana kadar tekrarla",
      display: "Görünüm",
      themeAuto: "Otomatik",
      fontSize: "Yazı tipi boyutu",
      fontSizeSmall: "Küçük",
      fontSizeNormal: "Normal",
      fontSizeLarge: "Büyük",
      animations: "Animasyonlar",
      animationsNone: "Yok",
      animationsNormal: "Normal",
      animationsFull: "Tam",
      accentColor: "Vurgu rengi",
      accentDefault: "Varsayılan",
      layouts: "Düzenler",
    },
    layoutManager: {
      title: "Düzenler",
      templates: "Şablonlar",
      templateDefault: "Varsayılan",
      templateDefaultDesc: "Üç sütun, ekranın sağ tarafı",
      templateCompact: "Kompakt",
      templateCompactDesc: "İki sütun, minimum boyutlar",
      templateMinimal: "Minimal",
      templateMinimalDesc: "Yüzen satırlar, ortalanmış",
      apply: "Uygula",
      saveCurrent: "Mevcut düzeni kaydet",
      namePlaceholder: "Düzen adı...",
      save: "Kaydet",
      customLayouts: "Özel düzenler",
      delete: "Sil",
      importExport: "İçe / Dışa aktar",
      export: "JSON dışa aktar",
      import: "JSON içe aktar",
      applied: "Düzen uygulandı.",
      saved: "Düzen kaydedildi.",
      exported: "Düzen dışa aktarıldı.",
      imported: "Düzen içe aktarıldı ve uygulandı.",
      nameRequired: "Düzen için bir ad girin.",
      error: "Düzen işlemi başarısız oldu.",
    },
    widgetContextMenu: {
      closeWidget: "Widget'ı kapat",
      pin: "Her zaman üstte",
      unpin: "Üstten kaldır",
      resize: "Boyutlandır",
      style: "Stil",
      cancel: "Vazgeç",
    },
    widgetStyle: {
      title: "Widget stili",
      accentColor: "Vurgu rengi",
      accentDefault: "Varsayılan",
      cornerRadius: "Köşe yuvarlaklığı",
      radiusSharp: "Keskin",
      radiusNormal: "Normal",
      radiusRound: "Yuvarlak",
      opacity: "Arka plan opaklığı",
      opacityDefault: "Varsayılan",
      blur: "Arka plan bulanıklığı",
      reset: "Stili sıfırla",
    },
    widgetSizeEditor: {
      title: "Widget boyutu",
      width: "Genişlik",
      height: "Yükseklik",
      limits: "Sınırlar: {minW}–{maxW} × {minH}–{maxH} px",
      apply: "Uygula",
      resetDefault: "Varsayılana sıfırla",
      invalidError: "Geçerli bir genişlik ve yükseklik girin.",
      applyError: "Boyut uygulanamadı.",
      loadError: "Boyut sınırları yüklenemedi.",
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
        worldClocks: "Dünya saatleri",
        alarm: "Alarm",
        alarmTitle: "Alarm",
        alarmBody: "Zamanı geldi!",
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
        hourly: "Sonraki 24 saat",
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
        uptimeHours: "sa",
        uptimeMinutes: "dk",
      },
      calendar: {
        name: "Takvim",
        description: "Aylık takvim görünümü",
        events: "Etkinlikler",
        addEvent: "Etkinlik ekle",
        eventPlaceholder: "Etkinlik başlığı...",
        noEvents: "Etkinlik yok",
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
        dueDate: "Son tarih",
        overdue: "Gecikmiş",
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
        notifications: "Bildirimler",
        autoNext: "Otomatik devam",
        workDuration: "Çalışma süresi",
        workDone: "Çalışma oturumu tamamlandı",
        workDoneBody: "Mola zamanı",
        breakDone: "Mola bitti",
        breakDoneBody: "İşe dönüş",
        timerDone: "Zamanlayıcı tamamlandı",
        timerDoneBody: "Süre doldu",
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
        alerts: "Fiyat alarmları",
        alertAbove: "Üstünde",
        alertBelow: "Altında",
        alertTitle: "{symbol} fiyat alarmı",
        alertAboveBody: "{symbol} {price} üzerinde",
        alertBelowBody: "{symbol} {price} altında",
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
      title: "AetherWidgets",
      subtitle: "Administrar widgets",
      language: "Idioma",
      theme: "Tema",
      themeDark: "Oscuro",
      themeLight: "Claro",
      snapToGrid: "Ajustar a la cuadrícula",
      settings: "Ajustes",
      launchAtStartup: "Iniciar al arrancar el sistema",
      minimizeToTray: "Minimizar a la bandeja",
      exit: "Salir",
      notifications: "Notificaciones",
      notificationSound: "Sonido de alerta",
      notificationSoundChime: "Campana",
      notificationSoundAlarm: "Alarma",
      notificationSoundNone: "Ninguno",
      notificationDuration: "Duración del sonido",
      notificationDurationSeconds: "{seconds}s",
      notificationRepeat: "Repetir hasta descartar",
      display: "Pantalla",
      themeAuto: "Auto",
      fontSize: "Tamaño de fuente",
      fontSizeSmall: "Pequeño",
      fontSizeNormal: "Normal",
      fontSizeLarge: "Grande",
      animations: "Animaciones",
      animationsNone: "Ninguna",
      animationsNormal: "Normal",
      animationsFull: "Completa",
      accentColor: "Color de acento",
      accentDefault: "Predeterminado",
      layouts: "Diseños",
    },
    layoutManager: {
      title: "Diseños",
      templates: "Plantillas",
      templateDefault: "Predeterminado",
      templateDefaultDesc: "Tres columnas, lado derecho de la pantalla",
      templateCompact: "Compacto",
      templateCompactDesc: "Dos columnas, tamaños mínimos",
      templateMinimal: "Mínimo",
      templateMinimalDesc: "Filas flotantes, centradas",
      apply: "Aplicar",
      saveCurrent: "Guardar disposición actual",
      namePlaceholder: "Nombre del diseño...",
      save: "Guardar",
      customLayouts: "Diseños personalizados",
      delete: "Eliminar",
      importExport: "Importar / Exportar",
      export: "Exportar JSON",
      import: "Importar JSON",
      applied: "Diseño aplicado.",
      saved: "Diseño guardado.",
      exported: "Diseño exportado.",
      imported: "Diseño importado y aplicado.",
      nameRequired: "Introduce un nombre para el diseño.",
      error: "La acción de diseño falló.",
    },
    widgetContextMenu: {
      closeWidget: "Cerrar widget",
      pin: "Siempre encima",
      unpin: "Quitar de encima",
      resize: "Redimensionar",
      style: "Estilo",
      cancel: "Cancelar",
    },
    widgetStyle: {
      title: "Estilo del widget",
      accentColor: "Color de acento",
      accentDefault: "Predeterminado",
      cornerRadius: "Radio de esquina",
      radiusSharp: "Recto",
      radiusNormal: "Normal",
      radiusRound: "Redondeado",
      opacity: "Opacidad del fondo",
      opacityDefault: "Predeterminada",
      blur: "Desenfoque del fondo",
      reset: "Restablecer estilo",
    },
    widgetSizeEditor: {
      title: "Tamaño del widget",
      width: "Ancho",
      height: "Alto",
      limits: "Límites: {minW}–{maxW} × {minH}–{maxH} px",
      apply: "Aplicar",
      resetDefault: "Restablecer predeterminado",
      invalidError: "Introduce un ancho y alto válidos.",
      applyError: "No se pudo aplicar el tamaño.",
      loadError: "No se pudieron cargar los límites de tamaño.",
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
        worldClocks: "Relojes del mundo",
        alarm: "Alarma",
        alarmTitle: "Alarma",
        alarmBody: "¡Es la hora!",
      },
      weather: {
        name: "Tiempo",
        description: "Tiempo actual",
        loading: "Cargando...",
        error: "No se pudo cargar el tiempo",
        searchPlaceholder: "Buscar ciudad o distrito...",
        currentLocation: "Ubicación actual",
        useSystemLocation: "Usar ubicación del sistema",
        locationPermissionNeeded: "Permite el acceso a la ubicación para usar tu ciudad actual.",
        searchNoResults: "Sin resultados",
        hourly: "Próximas 24 horas",
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
        uptimeHours: "h",
        uptimeMinutes: "min",
      },
      calendar: {
        name: "Calendario",
        description: "Vista mensual del calendario",
        events: "Eventos",
        addEvent: "Añadir evento",
        eventPlaceholder: "Título del evento...",
        noEvents: "Sin eventos",
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
        dueDate: "Fecha de vencimiento",
        overdue: "Vencido",
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
        notifications: "Notificaciones",
        autoNext: "Auto siguiente",
        workDuration: "Duración del trabajo",
        workDone: "Sesión de trabajo completada",
        workDoneBody: "Hora de descansar",
        breakDone: "El descanso terminó",
        breakDoneBody: "De vuelta al trabajo",
        timerDone: "Temporizador completado",
        timerDoneBody: "Se acabó el tiempo",
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
        alerts: "Alertas de precios",
        alertAbove: "Por encima",
        alertBelow: "Por debajo",
        alertTitle: "Alerta de precio de {symbol}",
        alertAboveBody: "{symbol} está por encima de ${price}",
        alertBelowBody: "{symbol} está por debajo de ${price}",
        loading: "Cargando...",
      },
    },
    weather: {
      descriptions: {
        0: "Cielo despejado",
        1: "Mayormente despejado",
        2: "Parcialmente nublado",
        3: "Nublado",
        45: "Niebla",
        48: "Niebla con escarcha",
        51: "Llovizna ligera",
        53: "Llovizna",
        55: "Llovizna densa",
        61: "Lluvia ligera",
        63: "Lluvia",
        65: "Lluvia fuerte",
        71: "Nieve ligera",
        73: "Nieve",
        75: "Nieve fuerte",
        77: "Granos de nieve",
        80: "Lluvias ligeras",
        81: "Lluvias",
        82: "Lluvias fuertes",
        85: "Nieve ligera",
        86: "Nieve fuerte",
        95: "Tormenta eléctrica",
        96: "Tormenta con granizo",
        99: "Granizo severo",
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
      title: "AetherWidgets",
      subtitle: "Widgets verwalten",
      language: "Sprache",
      theme: "Design",
      themeDark: "Dunkel",
      themeLight: "Hell",
      snapToGrid: "Am Raster ausrichten",
      settings: "Einstellungen",
      launchAtStartup: "Beim Systemstart ausführen",
      minimizeToTray: "In den Infobereich minimieren",
      exit: "Beenden",
      notifications: "Benachrichtigungen",
      notificationSound: "Benachrichtigungston",
      notificationSoundChime: "Glocke",
      notificationSoundAlarm: "Alarm",
      notificationSoundNone: "Keine",
      notificationDuration: "Tondauer",
      notificationDurationSeconds: "{seconds}s",
      notificationRepeat: "Wiederholen bis verworfen",
      display: "Anzeige",
      themeAuto: "Auto",
      fontSize: "Schriftgröße",
      fontSizeSmall: "Klein",
      fontSizeNormal: "Normal",
      fontSizeLarge: "Groß",
      animations: "Animationen",
      animationsNone: "Keine",
      animationsNormal: "Normal",
      animationsFull: "Voll",
      accentColor: "Akzentfarbe",
      accentDefault: "Standard",
      layouts: "Layouts",
    },
    layoutManager: {
      title: "Layouts",
      templates: "Vorlagen",
      templateDefault: "Standard",
      templateDefaultDesc: "Drei Spalten, rechte Bildschirmseite",
      templateCompact: "Kompakt",
      templateCompactDesc: "Zwei Spalten, minimale Größen",
      templateMinimal: "Minimal",
      templateMinimalDesc: "Schwebende Reihen, zentriert",
      apply: "Anwenden",
      saveCurrent: "Aktuelle Anordnung speichern",
      namePlaceholder: "Layout-Name...",
      save: "Speichern",
      customLayouts: "Eigene Layouts",
      delete: "Löschen",
      importExport: "Import / Export",
      export: "JSON exportieren",
      import: "JSON importieren",
      applied: "Layout angewendet.",
      saved: "Layout gespeichert.",
      exported: "Layout exportiert.",
      imported: "Layout importiert und angewendet.",
      nameRequired: "Gib einen Namen für das Layout ein.",
      error: "Die Layout-Aktion ist fehlgeschlagen.",
    },
    widgetContextMenu: {
      closeWidget: "Widget schließen",
      pin: "Immer im Vordergrund",
      unpin: "Vordergrund verlassen",
      resize: "Größe ändern",
      style: "Stil",
      cancel: "Abbrechen",
    },
    widgetStyle: {
      title: "Widget-Stil",
      accentColor: "Akzentfarbe",
      accentDefault: "Standard",
      cornerRadius: "Eckenradius",
      radiusSharp: "Eckig",
      radiusNormal: "Normal",
      radiusRound: "Rund",
      opacity: "Hintergrunddeckkraft",
      opacityDefault: "Standard",
      blur: "Hintergrundunschärfe",
      reset: "Stil zurücksetzen",
    },
    widgetSizeEditor: {
      title: "Widget-Größe",
      width: "Breite",
      height: "Höhe",
      limits: "Grenzen: {minW}–{maxW} × {minH}–{maxH} px",
      apply: "Anwenden",
      resetDefault: "Standard wiederherstellen",
      invalidError: "Gültige Breite und Höhe eingeben.",
      applyError: "Größe konnte nicht angewendet werden.",
      loadError: "Größengrenzen konnten nicht geladen werden.",
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
        worldClocks: "Weltuhren",
        alarm: "Wecker",
        alarmTitle: "Wecker",
        alarmBody: "Es ist Zeit!",
      },
      weather: {
        name: "Wetter",
        description: "Aktuelles Wetter",
        loading: "Wird geladen...",
        error: "Wetter konnte nicht geladen werden",
        searchPlaceholder: "Stadt oder Bezirk suchen...",
        currentLocation: "Aktueller Standort",
        useSystemLocation: "Systemstandort verwenden",
        locationPermissionNeeded:
          "Ermöglichen Sie Standortzugriff, um Ihre aktuelle Stadt zu verwenden.",
        searchNoResults: "Keine Ergebnisse gefunden",
        hourly: "Nächste 24 Stunden",
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
        uptimeHours: "Std.",
        uptimeMinutes: "Min.",
      },
      calendar: {
        name: "Kalender",
        description: "Monatsansicht des Kalenders",
        events: "Ereignisse",
        addEvent: "Ereignis hinzufügen",
        eventPlaceholder: "Ereignistitel...",
        noEvents: "Keine Ereignisse",
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
        dueDate: "Fälligkeitsdatum",
        overdue: "Überfällig",
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
        notifications: "Benachrichtigungen",
        autoNext: "Auto weiter",
        workDuration: "Arbeitsdauer",
        workDone: "Arbeitssitzung beendet",
        workDoneBody: "Zeit für eine Pause",
        breakDone: "Pause vorbei",
        breakDoneBody: "Zurück zur Arbeit",
        timerDone: "Timer abgelaufen",
        timerDoneBody: "Zeit ist um",
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
        alerts: "Preisalarme",
        alertAbove: "Über",
        alertBelow: "Unter",
        alertTitle: "{symbol}-Preisalarm",
        alertAboveBody: "{symbol} ist über ${price}",
        alertBelowBody: "{symbol} ist unter ${price}",
        loading: "Wird geladen...",
      },
    },
    weather: {
      descriptions: {
        0: "Klarer Himmel",
        1: "Meist klar",
        2: "Teilweise wolkig",
        3: "Bedeckt",
        45: "Nebel",
        48: "Raureif",
        51: "Leichte Nieselregen",
        53: "Nieselregen",
        55: "Dichter Nieselregen",
        61: "Leichter Regen",
        63: "Regen",
        65: "Starker Regen",
        71: "Leichter Schnee",
        73: "Schnee",
        75: "Starker Schnee",
        77: "Schneek\u00f6rner",
        80: "Leichte Regenscha\u00fcr",
        81: "Regenscha\u00fcr",
        82: "Starke Regenscha\u00fcr",
        85: "Leichte Schneescha\u00fcr",
        86: "Starke Schneescha\u00fcr",
        95: "Gewitter",
        96: "Gewitter mit Hagel",
        99: "Schwerer Hagelsturm",
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
      title: "AetherWidgets",
      subtitle: "Gérer les widgets",
      language: "Langue",
      theme: "Thème",
      themeDark: "Sombre",
      themeLight: "Clair",
      snapToGrid: "Aligner sur la grille",
      settings: "Paramètres",
      launchAtStartup: "Lancer au démarrage",
      minimizeToTray: "Réduire dans la barre d’état",
      exit: "Quitter",
      notifications: "Notifications",
      notificationSound: "Son d'alerte",
      notificationSoundChime: "Cloche",
      notificationSoundAlarm: "Alarme",
      notificationSoundNone: "Aucun",
      notificationDuration: "Durée du son",
      notificationDurationSeconds: "{seconds}s",
      notificationRepeat: "Répéter jusqu'à ignorer",
      display: "Affichage",
      themeAuto: "Auto",
      fontSize: "Taille de police",
      fontSizeSmall: "Petite",
      fontSizeNormal: "Normale",
      fontSizeLarge: "Grande",
      animations: "Animations",
      animationsNone: "Aucune",
      animationsNormal: "Normale",
      animationsFull: "Complète",
      accentColor: "Couleur d'accent",
      accentDefault: "Par défaut",
      layouts: "Dispositions",
    },
    layoutManager: {
      title: "Dispositions",
      templates: "Modèles",
      templateDefault: "Par défaut",
      templateDefaultDesc: "Trois colonnes, côté droit de l'écran",
      templateCompact: "Compact",
      templateCompactDesc: "Deux colonnes, tailles minimales",
      templateMinimal: "Minimal",
      templateMinimalDesc: "Rangées flottantes, centrées",
      apply: "Appliquer",
      saveCurrent: "Enregistrer la disposition actuelle",
      namePlaceholder: "Nom de la disposition...",
      save: "Enregistrer",
      customLayouts: "Dispositions personnalisées",
      delete: "Supprimer",
      importExport: "Importer / Exporter",
      export: "Exporter JSON",
      import: "Importer JSON",
      applied: "Disposition appliquée.",
      saved: "Disposition enregistrée.",
      exported: "Disposition exportée.",
      imported: "Disposition importée et appliquée.",
      nameRequired: "Saisissez un nom pour la disposition.",
      error: "L'action de disposition a échoué.",
    },
    widgetContextMenu: {
      closeWidget: "Fermer le widget",
      pin: "Toujours au premier plan",
      unpin: "Retirer du premier plan",
      resize: "Redimensionner",
      style: "Style",
      cancel: "Annuler",
    },
    widgetStyle: {
      title: "Style du widget",
      accentColor: "Couleur d'accent",
      accentDefault: "Par défaut",
      cornerRadius: "Arrondi des coins",
      radiusSharp: "Droit",
      radiusNormal: "Normal",
      radiusRound: "Arrondi",
      opacity: "Opacité de l'arrière-plan",
      opacityDefault: "Par défaut",
      blur: "Flou d'arrière-plan",
      reset: "Réinitialiser le style",
    },
    widgetSizeEditor: {
      title: "Taille du widget",
      width: "Largeur",
      height: "Hauteur",
      limits: "Limites : {minW}–{maxW} × {minH}–{maxH} px",
      apply: "Appliquer",
      resetDefault: "Taille par défaut",
      invalidError: "Saisissez une largeur et une hauteur valides.",
      applyError: "Impossible d'appliquer la taille.",
      loadError: "Impossible de charger les limites de taille.",
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
        worldClocks: "Horloges mondiales",
        alarm: "Alarme",
        alarmTitle: "Alarme",
        alarmBody: "C'est l'heure !",
      },
      weather: {
        name: "Météo",
        description: "Météo actuelle",
        loading: "Chargement...",
        error: "La météo n'a pas pu être chargée",
        searchPlaceholder: "Rechercher une ville ou un district...",
        currentLocation: "Localisation actuelle",
        useSystemLocation: "Utiliser la localisation système",
        locationPermissionNeeded:
          "Autorisez l'accès à la localisation pour utiliser votre ville actuelle.",
        searchNoResults: "Aucun résultat trouvé",
        hourly: "24 prochaines heures",
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
        uptimeHours: "h",
        uptimeMinutes: "min",
      },
      calendar: {
        name: "Calendrier",
        description: "Vue mensuelle du calendrier",
        events: "Événements",
        addEvent: "Ajouter un événement",
        eventPlaceholder: "Titre de l'événement...",
        noEvents: "Aucun événement",
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
        dueDate: "Date d'échéance",
        overdue: "En retard",
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
        notifications: "Notifications",
        autoNext: "Auto suivant",
        workDuration: "Durée du travail",
        workDone: "Session de travail terminée",
        workDoneBody: "C'est l'heure de la pause",
        breakDone: "La pause est terminée",
        breakDoneBody: "Retour au travail",
        timerDone: "Minuteur terminé",
        timerDoneBody: "Temps écoulé",
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
        alerts: "Alertes de prix",
        alertAbove: "Au-dessus",
        alertBelow: "En-dessous",
        alertTitle: "Alerte de prix {symbol}",
        alertAboveBody: "{symbol} est au-dessus de ${price}",
        alertBelowBody: "{symbol} est en-dessous de ${price}",
        loading: "Chargement...",
      },
    },
    weather: {
      descriptions: {
        0: "Ciel clair",
        1: "Principalement clair",
        2: "Partiellement nuageux",
        3: "Nuageux",
        45: "Brouillard",
        48: "Brouillard avec givre",
        51: "Léger crachin",
        53: "Crachin",
        55: "Crachin dense",
        61: "Pluie légère",
        63: "Pluie",
        65: "Pluie forte",
        71: "Neige légère",
        73: "Neige",
        75: "Neige forte",
        77: "Granules de neige",
        80: "Averses légères",
        81: "Averses",
        82: "Averses fortes",
        85: "Averses de neige légères",
        86: "Averses de neige fortes",
        95: "Orage",
        96: "Orage avec grêle",
        99: "Grêle sévère",
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
      title: "AetherWidgets",
      subtitle: "Управление виджетами",
      language: "Язык",
      theme: "Тема",
      themeDark: "Тёмная",
      themeLight: "Светлая",
      snapToGrid: "Привязка к сетке",
      settings: "Настройки",
      launchAtStartup: "Запускать при старте системы",
      minimizeToTray: "Свернуть в трей",
      exit: "Выход",
      notifications: "Уведомления",
      notificationSound: "Звук уведомления",
      notificationSoundChime: "Звонок",
      notificationSoundAlarm: "Аларм",
      notificationSoundNone: "Нет",
      notificationDuration: "Длительность звука",
      notificationDurationSeconds: "{seconds}s",
      notificationRepeat: "Повторять до закрытия",
      display: "Отображение",
      themeAuto: "Авто",
      fontSize: "Размер шрифта",
      fontSizeSmall: "Маленький",
      fontSizeNormal: "Обычный",
      fontSizeLarge: "Большой",
      animations: "Анимации",
      animationsNone: "Нет",
      animationsNormal: "Обычные",
      animationsFull: "Полные",
      accentColor: "Акцентный цвет",
      accentDefault: "По умолчанию",
      layouts: "Раскладки",
    },
    layoutManager: {
      title: "Раскладки",
      templates: "Шаблоны",
      templateDefault: "По умолчанию",
      templateDefaultDesc: "Три колонки, правая часть экрана",
      templateCompact: "Компактная",
      templateCompactDesc: "Две колонки, минимальные размеры",
      templateMinimal: "Минимальная",
      templateMinimalDesc: "Плавающие ряды, по центру",
      apply: "Применить",
      saveCurrent: "Сохранить текущее расположение",
      namePlaceholder: "Название раскладки...",
      save: "Сохранить",
      customLayouts: "Свои раскладки",
      delete: "Удалить",
      importExport: "Импорт / Экспорт",
      export: "Экспорт JSON",
      import: "Импорт JSON",
      applied: "Раскладка применена.",
      saved: "Раскладка сохранена.",
      exported: "Раскладка экспортирована.",
      imported: "Раскладка импортирована и применена.",
      nameRequired: "Введите название раскладки.",
      error: "Не удалось выполнить действие с раскладкой.",
    },
    widgetContextMenu: {
      closeWidget: "Закрыть виджет",
      pin: "Всегда поверх",
      unpin: "Убрать с переднего плана",
      resize: "Изменить размер",
      style: "Стиль",
      cancel: "Отмена",
    },
    widgetStyle: {
      title: "Стиль виджета",
      accentColor: "Акцентный цвет",
      accentDefault: "По умолчанию",
      cornerRadius: "Скругление углов",
      radiusSharp: "Острые",
      radiusNormal: "Обычные",
      radiusRound: "Круглые",
      opacity: "Непрозрачность фона",
      opacityDefault: "По умолчанию",
      blur: "Размытие фона",
      reset: "Сбросить стиль",
    },
    widgetSizeEditor: {
      title: "Размер виджета",
      width: "Ширина",
      height: "Высота",
      limits: "Ограничения: {minW}–{maxW} × {minH}–{maxH} px",
      apply: "Применить",
      resetDefault: "Сбросить размер",
      invalidError: "Введите корректные ширину и высоту.",
      applyError: "Не удалось применить размер.",
      loadError: "Не удалось загрузить ограничения размера.",
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
        worldClocks: "Мировые часы",
        alarm: "Будильник",
        alarmTitle: "Будильник",
        alarmBody: "Пора!",
      },
      weather: {
        name: "Погода",
        description: "Текущая погода",
        loading: "Загрузка...",
        error: "Не удалось загрузить погоду",
        searchPlaceholder: "Поиск города или района...",
        currentLocation: "Текущее местоположение",
        useSystemLocation: "Использовать местоположение системы",
        locationPermissionNeeded:
          "Разрешите доступ к местоположению для использования вашего текущего города.",
        searchNoResults: "Не найдено",
        hourly: "Следующие 24 часа",
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
        uptimeHours: "ч",
        uptimeMinutes: "мин",
      },
      calendar: {
        name: "Календарь",
        description: "Месячный вид календаря",
        events: "События",
        addEvent: "Добавить событие",
        eventPlaceholder: "Название события...",
        noEvents: "Нет событий",
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
        dueDate: "Дата выполнения",
        overdue: "Проваленые сроки",
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
        notifications: "Уведомления",
        autoNext: "Авто далее",
        workDuration: "Длительность работы",
        workDone: "Рабочая сессия завершена",
        workDoneBody: "Время перерыва",
        breakDone: "Перерыв окончен",
        breakDoneBody: "За работу",
        timerDone: "Таймер завершён",
        timerDoneBody: "Время вышло",
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
        alerts: "Ценовые оповещения",
        alertAbove: "Выше",
        alertBelow: "Ниже",
        alertTitle: "Оповещение о цене {symbol}",
        alertAboveBody: "{symbol} выше ${price}",
        alertBelowBody: "{symbol} ниже ${price}",
        loading: "Загрузка...",
      },
    },
    weather: {
      descriptions: {
        0: "Ясное небо",
        1: "Преимущественно ясно",
        2: "Частично облачно",
        3: "Облачно",
        45: "Туман",
        48: "Туман с инеем",
        51: "Легкая морось",
        53: "Морось",
        55: "Плотная морось",
        61: "Легкий дождь",
        63: "Дождь",
        65: "Сильный дождь",
        71: "Легкий снег",
        73: "Снег",
        75: "Сильный снег",
        77: "Снежные зёрна",
        80: "Лёгкие ливни",
        81: "Ливни",
        82: "Сильные ливни",
        85: "Лёгкие снежные ливни",
        86: "Сильные снежные ливни",
        95: "Гроза",
        96: "Гроза с градом",
        99: "Сильная град",
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
      title: "AetherWidgets",
      subtitle: "管理小组件",
      language: "语言",
      theme: "主题",
      themeDark: "深色",
      themeLight: "浅色",
      snapToGrid: "对齐网格",
      settings: "设置",
      launchAtStartup: "开机时启动",
      minimizeToTray: "最小化到托盘",
      exit: "退出",
      notifications: "通知",
      notificationSound: "提醒音",
      notificationSoundChime: "铃声",
      notificationSoundAlarm: "闹钟",
      notificationSoundNone: "无",
      notificationDuration: "声音时长",
      notificationDurationSeconds: "{seconds}s",
      notificationRepeat: "重复直到关闭",
      display: "显示",
      themeAuto: "自动",
      fontSize: "字体大小",
      fontSizeSmall: "小",
      fontSizeNormal: "标准",
      fontSizeLarge: "大",
      animations: "动画",
      animationsNone: "无",
      animationsNormal: "标准",
      animationsFull: "完整",
      accentColor: "强调色",
      accentDefault: "默认",
      layouts: "布局",
    },
    layoutManager: {
      title: "布局",
      templates: "模板",
      templateDefault: "默认",
      templateDefaultDesc: "三列，屏幕右侧",
      templateCompact: "紧凑",
      templateCompactDesc: "两列，最小尺寸",
      templateMinimal: "极简",
      templateMinimalDesc: "浮动行，居中",
      apply: "应用",
      saveCurrent: "保存当前排列",
      namePlaceholder: "布局名称...",
      save: "保存",
      customLayouts: "自定义布局",
      delete: "删除",
      importExport: "导入 / 导出",
      export: "导出 JSON",
      import: "导入 JSON",
      applied: "布局已应用。",
      saved: "布局已保存。",
      exported: "布局已导出。",
      imported: "布局已导入并应用。",
      nameRequired: "请输入布局名称。",
      error: "布局操作失败。",
    },
    widgetContextMenu: {
      closeWidget: "关闭小组件",
      pin: "始终置顶",
      unpin: "取消置顶",
      resize: "调整大小",
      style: "样式",
      cancel: "取消",
    },
    widgetStyle: {
      title: "小组件样式",
      accentColor: "强调色",
      accentDefault: "默认",
      cornerRadius: "圆角",
      radiusSharp: "直角",
      radiusNormal: "标准",
      radiusRound: "圆润",
      opacity: "背景不透明度",
      opacityDefault: "默认",
      blur: "背景模糊",
      reset: "重置样式",
    },
    widgetSizeEditor: {
      title: "小组件大小",
      width: "宽度",
      height: "高度",
      limits: "限制：{minW}–{maxW} × {minH}–{maxH} px",
      apply: "应用",
      resetDefault: "恢复默认大小",
      invalidError: "请输入有效的宽度和高度。",
      applyError: "无法应用大小。",
      loadError: "无法加载大小限制。",
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
        worldClocks: "世界时钟",
        alarm: "闹钟",
        alarmTitle: "闹钟",
        alarmBody: "时间到了！",
      },
      weather: {
        name: "天气",
        description: "当前天气",
        loading: "加载中...",
        error: "天气无法加载",
        searchPlaceholder: "搜索城市或区域...",
        currentLocation: "当前位置",
        useSystemLocation: "使用系统位置",
        locationPermissionNeeded: "授权位置访问以使用你的当前城市。",
        searchNoResults: "找不到结果",
        hourly: "未来 24 小时",
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
        uptimeHours: "小时",
        uptimeMinutes: "分钟",
      },
      calendar: {
        name: "日历",
        description: "月历视图",
        events: "事件",
        addEvent: "添加事件",
        eventPlaceholder: "事件标题...",
        noEvents: "没有事件",
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
        dueDate: "截止日期",
        overdue: "逾期",
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
        notifications: "通知",
        autoNext: "自动继续",
        workDuration: "工作时长",
        workDone: "工作时段完成",
        workDoneBody: "该休息了",
        breakDone: "休息结束",
        breakDoneBody: "回去工作",
        timerDone: "计时完成",
        timerDoneBody: "时间到",
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
        alerts: "价格提醒",
        alertAbove: "高于",
        alertBelow: "低于",
        alertTitle: "{symbol} 价格提醒",
        alertAboveBody: "{symbol} 高于 ${price}",
        alertBelowBody: "{symbol} 低于 ${price}",
        loading: "加载中...",
      },
    },
    weather: {
      descriptions: {
        0: "晴朗",
        1: "主要晴朗",
        2: "部分多云",
        3: "多云",
        45: "雾",
        48: "霜冻雾",
        51: "轻微毛毛雨",
        53: "毛毛雨",
        55: "密集毛毛雨",
        61: "轻雨",
        63: "雨",
        65: "大雨",
        71: "轻雪",
        73: "雪",
        75: "大雪",
        77: "雪粒",
        80: "轻阵雨",
        81: "阵雨",
        82: "大阵雨",
        85: "轻阵雪",
        86: "大阵雪",
        95: "雷暴",
        96: "伴有冰雹的雷暴",
        99: "严重冰雹",
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

/**
 * Translates a path outside of React (e.g. inside `notify()`), using the
 * language preference currently stored in localStorage.
 */
export function translatePath(path: string): string {
  return createTranslator(readStoredLanguage())(path);
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
