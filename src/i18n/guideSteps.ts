import { GameToolId, LanguageCode, ToolId } from '../types';

export interface GuideStepDef {
  id: string;
  target: string;
  scoped?: boolean;
  title: string;
  description: string;
}

interface GuideCopyEntry {
  title: string;
  description: string;
}

type LangRecord = Record<LanguageCode, GuideCopyEntry>;

function pick(rec: LangRecord, lang: LanguageCode): GuideCopyEntry {
  return rec[lang] || rec.en;
}

const MENU_COPY: Record<string, LangRecord> = {
  guideToggle: {
    en: { title: 'Guide Mode', description: 'Use Next and Back to inspect every control one by one. Click this ? button again anytime to exit Guide Mode.' },
    ru: { title: 'Режим гида', description: 'Нажимайте «Далее» и «Назад», чтобы изучить каждый элемент по очереди. Нажмите кнопку ? снова, чтобы выйти.' },
    es: { title: 'Modo Guía', description: 'Usa Siguiente y Atrás para ver cada control paso a paso. Pulsa este botón ? de nuevo para salir.' },
    de: { title: 'Guide-Modus', description: 'Nutze Weiter und Zurück, um jedes Element einzeln anzusehen. Klicke erneut auf ?, um den Guide zu beenden.' },
    fr: { title: 'Mode Guide', description: 'Utilisez Suivant et Retour pour découvrir chaque contrôle un par un. Cliquez à nouveau sur ? pour quitter.' },
  },
  topbar: {
    en: { title: 'Quick Bar', description: 'Mute or unmute sound effects, switch between Light and Dark theme, toggle Guide Mode, or open Settings.' },
    ru: { title: 'Панель управления', description: 'Включайте и выключайте звук, меняйте светлую/тёмную тему, открывайте гид или настройки.' },
    es: { title: 'Barra rápida', description: 'Activa o silencia el sonido, cambia entre tema claro/oscuro, abre la guía o entra en Ajustes.' },
    de: { title: 'Schnellleiste', description: 'Sound stummschalten, zwischen Hell/Dunkel wechseln, Guide öffnen oder Einstellungen anpassen.' },
    fr: { title: 'Barre rapide', description: 'Coupez ou activez le son, passez du thème clair au sombre, ouvrez le guide ou les paramètres.' },
  },
  sidebar: {
    en: { title: 'Games & Tools Menu', description: 'Switch between All History and all 11 games. Favorited games stay pinned at the top with a red heart.' },
    ru: { title: 'Меню игр и разделов', description: 'Переключайтесь между историей и 11 играми. Избранные игры закрепляются вверху с красным сердечком.' },
    es: { title: 'Menú de juegos', description: 'Cambia entre el historial y los 11 juegos. Tus favoritos quedan fijados arriba con un corazón rojo.' },
    de: { title: 'Spiele-Menü', description: 'Wechsle zwischen Verlauf und allen 11 Spielen. Favoriten bleiben oben mit rotem Herz angeheftet.' },
    fr: { title: 'Menu des jeux', description: 'Passez de l’historique aux 11 jeux. Vos favoris restent épinglés en haut avec un cœur rouge.' },
  },
  dashHistory: {
    en: { title: 'All History & Stats', description: 'View a combined timeline of every decision made plus probability charts, coin balance, and streaks.' },
    ru: { title: 'Вся история и статистика', description: 'Общая лента всех результатов, графики вероятностей, баланс монетки и точность в играх.' },
    es: { title: 'Historial y estadísticas', description: 'Consulta el registro completo con gráficos de probabilidad, balance de moneda y rachas.' },
    de: { title: 'Gesamtverlauf & Statistik', description: 'Alle Ergebnisse chronologisch mit Wahrscheinlichkeits-Charts, Münzverteilung und Serien.' },
    fr: { title: 'Historique et statistiques', description: 'Consultez le journal complet avec graphiques de probabilité, équilibre pièce et séries.' },
  },
  favHeart: {
    en: { title: 'Red-Heart Favorites', description: 'Click the heart icon on any game card to favorite it and pin it to the top of the menu.' },
    ru: { title: 'Избранное (красное сердце)', description: 'Нажмите на сердечко на любой карточке, чтобы закрепить любимую игру вверху списка.' },
    es: { title: 'Favoritos con corazón rojo', description: 'Pulsa el corazón en cualquier tarjeta para fijar ese juego arriba del todo.' },
    de: { title: 'Favoriten mit rotem Herz', description: 'Klicke auf das Herz einer Spielkarte, um sie oben anzuheften.' },
    fr: { title: 'Favoris cœur rouge', description: 'Cliquez sur le cœur d’une carte pour l’épingler en haut du menu.' },
  },
};

const GAME_CARD_COPY: Record<GameToolId, LangRecord> = {
  wheel: {
    en: { title: 'Wheel of Fortune', description: 'A spinning prize wheel with peg ticks. Add custom options, save presets, remove winners, or run up to 100× spins in one roll.' },
    ru: { title: 'Колесо Фортуны', description: 'Вращающееся колесо со щелчками. Свои варианты, пресеты, удаление победителей и серии до 100× бросков.' },
    es: { title: 'Ruleta de la Fortuna', description: 'Rueda giratoria con ticks. Añade opciones, guarda preajustes, elimina ganadores o simula hasta 100× giros.' },
    de: { title: 'Glücksrad', description: 'Drehendes Rad mit Klick-Sound. Eigene Optionen, Vorlagen, Gewinner entfernen oder bis zu 100× Durchläufe.' },
    fr: { title: 'Roue de la Fortune', description: 'Roue physique avec clics. Ajoutez vos options, sauvegardez des modèles ou lancez jusqu’à 100× tirages.' },
  },
  roulette: {
    en: { title: 'Roulette', description: 'A horizontal sliding card track that decelerates smoothly onto the center needle. Supports multi-run stats and presets.' },
    ru: { title: 'Рулетка', description: 'Горизонтальная лента карточек с плавным торможением на центральной стрелке. Поддерживает серии и пресеты.' },
    es: { title: 'Ruleta Lineal', description: 'Pista horizontal deslizante que frena suavemente en la aguja central. Incluye estadísticas múltiples.' },
    de: { title: 'Roulette', description: 'Horizontale Laufleiste, die sanft an der Mittelmarkierung stoppt. Mit Vorlagen und Serien-Statistik.' },
    fr: { title: 'Roulette', description: 'Piste horizontale qui décélère jusqu’à l’aiguille centrale. Supporte les séries et modèles.' },
  },
  bottle: {
    en: { title: 'Spin the Bottle', description: 'Players sit around a circle while the center bottle spins and points to the winner. Great for party turns and dares.' },
    ru: { title: 'Бутылочка', description: 'Игроки сидят по кругу, а бутылочка в центре крутится и указывает на победителя. Отлично для компаний!' },
    es: { title: 'Girar la Botella', description: 'Los jugadores rodean una botella central que gira y señala al elegido. Ideal para fiestas y retos.' },
    de: { title: 'Flaschendrehen', description: 'Spieler sitzen im Kreis, während die Flasche in der Mitte dreht und auf den Gewinner zeigt.' },
    fr: { title: 'Jeu de la Bouteille', description: 'Les joueurs forment un cercle autour d’une bouteille qui tourne pour désigner un participant.' },
  },
  cards: {
    en: { title: 'Mystery Cards', description: 'Your options are shuffled face-down behind mystery cards. Pick a card to flip it with animation and reveal what was hidden.' },
    ru: { title: 'Тайные Карты', description: 'Варианты перемешаны рубашкой вверх. Выберите карту, чтобы перевернуть её и узнать, что под ней спрятано.' },
    es: { title: 'Cartas Misteriosas', description: 'Tus opciones se barajan boca abajo. Elige una carta para voltearla con animación y revelar el resultado.' },
    de: { title: 'Geheimkarten', description: 'Deine Optionen liegen verdeckt gemischt. Wähle eine Karte zum Umdrehen und Aufdecken.' },
    fr: { title: 'Cartes Mystères', description: 'Vos options sont mélangées face cachée. Touchez une carte pour la retourner et découvrir le choix.' },
  },
  dice: {
    en: { title: 'Dice Roll', description: 'Roll 1–6 dice from D4 up to D20. Click dice to lock/hold between rolls, add modifiers, or simulate multi-throws with averages.' },
    ru: { title: 'Бросок Костей', description: 'Бросайте от 1 до 6 кубиков (D4–D20). Нажимайте на кости для фиксации, добавляйте модификатор и считайте среднее.' },
    es: { title: 'Lanzar Dados', description: 'Tira de 1 a 6 dados (D4–D20). Bloquea dados entre tiradas, añade modificadores o simula múltiples tiros.' },
    de: { title: 'Würfeln', description: 'Wirf 1–6 Würfel (W4–W20). Fixiere einzelne Würfel, füge Modifikatoren hinzu oder simuliere Serien.' },
    fr: { title: 'Lancer de Dés', description: 'Lancez 1 à 6 dés (D4–D20). Verrouillez des dés entre deux lancers, ajoutez un modificateur ou simulez.' },
  },
  coin: {
    en: { title: 'Coin Flip', description: 'Toss a 3D coin using Classic, Currency, Yes/No, or your own Custom Text labels—single flips, Best-of-3/5, or multi-flip stats.' },
    ru: { title: 'Монетка', description: 'Подбросьте монетку: Орёл/Решка, Валюты, Да/Нет или свой текст. Один бросок, матчи BO3/BO5 и серии.' },
    es: { title: 'Lanzar Moneda', description: 'Lanza una moneda 3D con texto clásico, Sí/No o personalizado, al mejor de 3/5 o múltiples tiros.' },
    de: { title: 'Münzwurf', description: 'Wirf eine 3D-Münze mit Klassik, Ja/Nein oder eigenem Text – Einzelwurf, Best-of-3/5 oder Serien.' },
    fr: { title: 'Pile ou Face', description: 'Lancez une pièce 3D (Classique, Oui/Non ou texte libre) en tirage simple, série BO3/BO5 ou multi-lancers.' },
  },
  shell: {
    en: { title: 'Cup & Ball', description: 'Classic street game: watch the yellow ball hide under a red cup, follow the swaps, and guess the right cup to build a streak!' },
    ru: { title: 'Напёрстки', description: 'Следите, под каким красным стаканом спрятан жёлтый шарик во время перемешиваний, и собирайте серию побед!' },
    es: { title: 'Vasos y Bola', description: 'Sigue la bola amarilla bajo los vasos rojos mientras se mezclan y adivina dónde quedó para sumar racha.' },
    de: { title: 'Hütchenspiel', description: 'Verfolge die gelbe Kugel unter den roten Bechern beim Mischen und tippe den richtigen Becher an!' },
    fr: { title: 'Bonneteau', description: 'Suivez la balle jaune cachée sous les gobelets rouges pendant le mélange et devinez où elle se trouve !' },
  },
  number: {
    en: { title: 'Random Number', description: 'Draw 1 to 10 random numbers between any Min and Max (including 0 and negatives), with optional no-repeats pool and sorting.' },
    ru: { title: 'Случайное Число', description: 'Выбор от 1 до 10 чисел в любом диапазоне (с нулём и минусом), режимом без повторов и сортировкой.' },
    es: { title: 'Número Aleatorio', description: 'Extrae de 1 a 10 números entre cualquier mínimo y máximo, con opción sin repeticiones y orden.' },
    de: { title: 'Zufallszahl', description: 'Ziehe 1 bis 10 Zahlen aus einem beliebigen Bereich, optional ohne Wiederholungen und sortiert.' },
    fr: { title: 'Nombre Aléatoire', description: 'Tirez 1 à 10 nombres dans n’importe quelle plage, avec mode sans doublons et tri automatique.' },
  },
  choice: {
    en: { title: 'Random Choice', description: 'Quickly pick one random winner from a list—or switch to Split Teams to divide names into 2–4 balanced random teams.' },
    ru: { title: 'Случайный Выбор', description: 'Быстро выберите один вариант из списка или переключитесь на «Команды», чтобы разделить игроков на 2–4 группы.' },
    es: { title: 'Elección Aleatoria', description: 'Elige un ganador al azar o divide tu lista en 2–4 equipos aleatorios equilibrados.' },
    de: { title: 'Zufallsauswahl', description: 'Ziehe schnell einen Gewinner aus deiner Liste oder teile Namen zufällig in 2–4 Teams auf.' },
    fr: { title: 'Choix Aléatoire', description: 'Tirez rapidement un gagnant ou répartissez une liste en 2 à 4 équipes aléatoires.' },
  },
  password: {
    en: { title: 'Password Generator', description: 'Generate strong crypto-random passwords or readable word passphrases with an instant entropy strength meter and 1-click copy.' },
    ru: { title: 'Генератор Паролей', description: 'Создавайте надёжные пароли или парольные фразы с оценкой энтропии и копированием в 1 клик.' },
    es: { title: 'Generador de Contraseñas', description: 'Crea contraseñas seguras o frases de paso con medidor de entropía y copia en 1 clic.' },
    de: { title: 'Passwort-Generator', description: 'Erstelle sichere Zufallspasswörter oder Passphrasen mit Entropie-Anzeige und 1-Klick-Kopie.' },
    fr: { title: 'Mot de Passe', description: 'Générez des mots de passe robustes ou phrases secrètes avec jauge d’entropie et copie rapide.' },
  },
  color: {
    en: { title: 'Color Generator', description: 'Generate random colors with automatic readable contrast, copy HEX/RGB/HSL values, and explore a 4-swatch harmonious palette.' },
    ru: { title: 'Генератор Цветов', description: 'Подбирайте случайные цвета, копируйте HEX/RGB/HSL, проверяйте контраст WCAG и берите готовую палитру.' },
    es: { title: 'Generador de Color', description: 'Genera colores aleatorios, copia HEX/RGB/HSL, revisa contraste WCAG y explora paletas armónicas.' },
    de: { title: 'Farb-Generator', description: 'Erzeuge Zufallsfarben mit HEX/RGB/HSL-Kopie, WCAG-Kontrastprüfung und 4er-Farbpalette.' },
    fr: { title: 'Générateur de Couleur', description: 'Générez des couleurs, copiez HEX/RGB/HSL, vérifiez le contraste WCAG et explorez la palette.' },
  },
};

const SHARED_GAME_COPY: Record<string, LangRecord> = {
  savedPresets: {
    en: { title: 'Saved Presets & Share Link', description: 'Save your current list under a custom name to reload in 1 click, or copy a Share Link to send your setup to friends.' },
    ru: { title: 'Мои пресеты и ссылка', description: 'Сохраните текущий список под своим названием для загрузки в 1 клик или скопируйте ссылку, чтобы поделиться.' },
    es: { title: 'Guardados y Compartir', description: 'Guarda tu lista con un nombre para recargarla en 1 clic, o copia un enlace para enviarla a amigos.' },
    de: { title: 'Gespeicherte Vorlagen & Link', description: 'Speichere deine Liste zum 1-Klick-Laden oder teile sie per Link mit Freunden.' },
    fr: { title: 'Modèles enregistrés & Lien', description: 'Sauvegardez votre liste pour la recharger en 1 clic ou partagez-la par lien.' },
  },
  repeatCount: {
    en: { title: 'Throws / Runs (1–100×)', description: 'Pick how many times to run in a single animation. When set above 1×, the animation lands on the overall most frequent winner and shows full stats!' },
    ru: { title: 'Число бросков (1–100×)', description: 'Задайте количество повторов за один запуск. Если больше 1×, игра покажет самого частого победителя и полную статистику!' },
    es: { title: 'Tiradas / Veces (1–100×)', description: 'Elige cuántas veces simular en una sola animación. Con más de 1×, muestra el ganador más frecuente y las estadísticas.' },
    de: { title: 'Anzahl Würfe (1–100×)', description: 'Wähle die Anzahl der Simulationen in einer Animation. Über 1× landet es beim häufigsten Sieger samt Statistik.' },
    fr: { title: 'Nombre de lancers (1–100×)', description: 'Choisissez le nombre de tirages en une animation : au-dessus de 1×, le gagnant le plus fréquent et les stats s’affichent.' },
  },
  eliminate: {
    en: { title: 'Remove Winner Mode', description: 'When enabled, each winner is removed from the list after being picked so everyone gets a fair turn. Use Restore anytime to bring them back.' },
    ru: { title: 'Удаление победителя', description: 'После выбора победитель автоматически убирается из списка, чтобы варианты не повторялись. Кнопка «Вернуть» восстанавливает всё.' },
    es: { title: 'Eliminar ganador', description: 'Si está activo, el ganador se retira de la lista para que no se repita. Puedes restaurarlos cuando quieras.' },
    de: { title: 'Gewinner entfernen', description: 'Entfernt jeden Gewinner automatisch nach dem Zug, damit nichts doppelt kommt. Jederzeit wiederherstellbar.' },
    fr: { title: 'Retirer le gagnant', description: 'Retire automatiquement le gagnant après chaque tirage pour éviter les doublons. Restaurable à tout moment.' },
  },
  duration: {
    en: { title: 'Spin Duration', description: 'Choose how long the spin takes: Fast (2s), Normal (4s), or Suspense (6s).' },
    ru: { title: 'Длительность вращения', description: 'Выберите время анимации: Быстро (2с), Норма (4с) или Интрига (6с).' },
    es: { title: 'Duración del giro', description: 'Elige cuánto dura la animación: Rápido (2s), Normal (4s) o Suspenso (6s).' },
    de: { title: 'Drehdauer', description: 'Wähle die Dauer der Animation: Schnell (2s), Normal (4s) oder Spannung (6s).' },
    fr: { title: 'Durée de rotation', description: 'Choisissez la durée : Rapide (2s), Normal (4s) ou Suspense (6s).' },
  },
  toolHistory: {
    en: { title: 'Tool History', description: 'Shows recent results for this game right here so you can check past spins or rolls.' },
    ru: { title: 'История игры', description: 'Здесь отображаются недавние результаты именно этого инструмента.' },
    es: { title: 'Historial reciente', description: 'Muestra los últimos resultados de esta herramienta aquí mismo.' },
    de: { title: 'Spielverlauf', description: 'Zeigt die letzten Ergebnisse dieses Spiels direkt in der Seitenleiste.' },
    fr: { title: 'Historique récent', description: 'Affiche ici les derniers résultats de ce jeu.' },
  },
  gameFav: {
    en: { title: 'Favorite This Game', description: 'Click the heart to add or remove this game from your favorites.' },
    ru: { title: 'Добавить в избранное', description: 'Нажмите на сердечко, чтобы добавить или убрать игру из избранного.' },
    es: { title: 'Favorito', description: 'Pulsa el corazón para añadir o quitar este juego de tus favoritos.' },
    de: { title: 'Spiel favorisieren', description: 'Klicke das Herz, um dieses Spiel zu deinen Favoriten hinzuzufügen.' },
    fr: { title: 'Mettre en favori', description: 'Cliquez sur le cœur pour ajouter ou retirer ce jeu de vos favoris.' },
  },
  stageMode: {
    en: { title: 'Stage Mode', description: 'Hides sidebars so the game fills your screen cleanly—great for sharing on a TV or projector. Press Esc to exit.' },
    ru: { title: 'Полноэкранный режим', description: 'Скрывает боковые панели, оставляя только игровое поле. Удобно для трансляций и компании. Выход по Esc.' },
    es: { title: 'Modo Escenario', description: 'Oculta los paneles laterales para centrarse solo en el juego. Pulsa Esc para salir.' },
    de: { title: 'Bühnenmodus', description: 'Blendet Seitenleisten aus, um das Spiel groß darzustellen. Mit Esc beenden.' },
    fr: { title: 'Mode Scène', description: 'Masque les panneaux latéraux pour profiter du jeu en grand écran. Appuyez sur Échap pour quitter.' },
  },
};

const TOOL_SPECIFIC_COPY: Record<string, LangRecord> = {
  wheelStage: {
    en: { title: 'Wheel Arena', description: 'Click anywhere on the wheel (or press Space) to spin. The top pointer ticks off every slice peg and shows the winner with a Copy Result button.' },
    ru: { title: 'Игровое поле колеса', description: 'Нажмите на колесо (или Пробел), чтобы закрутить. Стрелка сверху отщёлкивает сектора и показывает победителя с кнопкой копирования.' },
    es: { title: 'Ruleta interactiva', description: 'Haz clic en la rueda (o pulsa Espacio) para girar. La aguja superior marca el ganador con botón para copiar.' },
    de: { title: 'Glücksrad-Bühne', description: 'Klicke auf das Rad (oder Leertaste) zum Drehen. Der obere Zeiger zeigt den Gewinner samt Kopier-Button.' },
    fr: { title: 'Roue interactive', description: 'Cliquez sur la roue (ou Espace) pour tourner. L’aiguille désigne le gagnant avec bouton de copie.' },
  },
  wheelAction: {
    en: { title: 'Spin Wheel Button', description: 'Starts the spin. Notice the (N×) label whenever Throws/Runs is above 1×.' },
    ru: { title: 'Кнопка запуска', description: 'Запускает вращение. Если выбран режим серии, на кнопке показано количество запусков (N×).' },
    es: { title: 'Botón Girar', description: 'Inicia el giro. Si elegiste varias tiradas, muestra el multiplicador (N×).' },
    de: { title: 'Drehen-Button', description: 'Startet das Rad. Bei Mehrfachläufen wird die Anzahl (N×) angezeigt.' },
    fr: { title: 'Bouton Tourner', description: 'Lance la roue. Le nombre de tirages (N×) s’affiche en mode multi-lancers.' },
  },
  wheelPresets: {
    en: { title: 'Quick Presets', description: 'Load ready-made option lists like Lunch, Yes/No, Activities, or Numbers in 1 click.' },
    ru: { title: 'Быстрые пресеты', description: 'Готовые наборы вариантов (Еда, Да/Нет, Занятия, Числа) загружаются одним нажатием.' },
    es: { title: 'Preajustes rápidos', description: 'Carga listas listas para usar como Comida, Sí/No o Actividades en 1 clic.' },
    de: { title: 'Schnellvorlagen', description: 'Lade fertige Listen wie Mittagessen, Ja/Nein oder Zahlen mit einem Klick.' },
    fr: { title: 'Modèles rapides', description: 'Chargez des listes prêtes à l’emploi en un clic.' },
  },
  wheelOptions: {
    en: { title: 'Options List & Shuffle', description: 'Type or paste one option per line (up to 24). Use Shuffle to randomize their order on the wheel.' },
    ru: { title: 'Список вариантов', description: 'Введите варианты по одному на строку (до 24). Кнопка «Перемешать» меняет их порядок на колесе.' },
    es: { title: 'Lista de opciones', description: 'Escribe una opción por línea (hasta 24). Usa Mezclar para cambiar su orden.' },
    de: { title: 'Optionsliste & Mischen', description: 'Eine Option pro Zeile eingeben (bis 24). Mit Mischen neu anordnen.' },
    fr: { title: 'Liste d’options', description: 'Écrivez une option par ligne (jusqu’à 24) et mélangez leur ordre si besoin.' },
  },
  rouletteStage: {
    en: { title: 'Roulette Track', description: 'Cards glide past the center needle and slow down onto the winning slot, plus a Copy Result button.' },
    ru: { title: 'Лента рулетки', description: 'Карточки прокручиваются под центральной стрелкой и останавливаются на победителе.' },
    es: { title: 'Pista de Ruleta', description: 'Las tarjetas pasan por la aguja central hasta detenerse en el ganador.' },
    de: { title: 'Roulette-Laufband', description: 'Die Karten gleiten an der Nadel vorbei und stoppen exakt beim Gewinner.' },
    fr: { title: 'Piste de Roulette', description: 'Les cartes défilent sous l’aiguille centrale jusqu’au gagnant.' },
  },
  rouletteAction: {
    en: { title: 'Start Roulette', description: 'Spins the track once (or simulates all N× runs and stops on the most frequent winner).' },
    ru: { title: 'Запустить рулетку', description: 'Запускает прокрутку ленты (в серии N× останавливается на самом частом победителе).' },
    es: { title: 'Iniciar Ruleta', description: 'Lanza la pista una vez (o muestra el ganador más frecuente en N× tiradas).' },
    de: { title: 'Roulette starten', description: 'Startet das Band (bei N× Läufen stoppt es beim häufigsten Sieger).' },
    fr: { title: 'Lancer la roulette', description: 'Lance le défilement (en mode N×, s’arrête sur le gagnant le plus fréquent).' },
  },
  bottleStage: {
    en: { title: 'Bottle Circle Arena', description: 'All players or options sit around the ring. Tap the bottle (or press Space) to spin it smoothly toward a winner.' },
    ru: { title: 'Игровой круг с бутылочкой', description: 'Участники располагаются по кругу. Нажмите на бутылочку в центре (или Пробел), чтобы закрутить её.' },
    es: { title: 'Círculo y Botella', description: 'Los jugadores rodean el tablero. Toca la botella (o pulsa Espacio) para girarla hacia un ganador.' },
    de: { title: 'Flaschendrehen-Kreis', description: 'Alle Spieler sitzen im Ring. Tippe auf die Flasche (oder Leertaste), um sie zu drehen.' },
    fr: { title: 'Cercle & Bouteille', description: 'Les joueurs sont placés en cercle. Touchez la bouteille (ou Espace) pour la faire tourner.' },
  },
  bottleAction: {
    en: { title: 'Spin Bottle Button', description: 'Starts the bottle spin. With Runs > 1×, it lands on whichever slot won the most rounds.' },
    ru: { title: 'Кнопка «Крутить»', description: 'Запускает вращение. При серии > 1× указывает на самого частого победителя.' },
    es: { title: 'Botón Girar Botella', description: 'Gira la botella. Con más de 1× tirada, apunta al ganador más frecuente.' },
    de: { title: 'Flasche drehen', description: 'Dreht die Flasche. Bei >1× Durchläufen zeigt sie auf den Gesamtsieger.' },
    fr: { title: 'Tourner la bouteille', description: 'Lance la bouteille. Avec >1× lancers, désigne le plus fréquent.' },
  },
  cardsStage: {
    en: { title: 'Face-Down Mystery Cards', description: 'Your options are shuffled face-down. Click any card to flip it with a 3D animation and reveal what was underneath!' },
    ru: { title: 'Карты рубашкой вверх', description: 'Ваши варианты перемешаны и скрыты. Нажмите на любую карту, чтобы перевернуть её и узнать результат!' },
    es: { title: 'Cartas boca abajo', description: 'Tus opciones están escondidas al azar. Pulsa cualquier carta para voltearla y descubrir qué había debajo.' },
    de: { title: 'Verdeckte Geheimkarten', description: 'Deine Optionen sind gemischt verdeckt. Klicke eine Karte an, um sie umzudrehen!' },
    fr: { title: 'Cartes face cachée', description: 'Vos choix sont mélangés face cachée. Cliquez sur une carte pour la retourner !' },
  },
  cardsActions: {
    en: { title: 'Shuffle & Reveal All', description: 'Use Shuffle & Reset to flip cards back down in a new random order, or Reveal All to peek at every remaining card.' },
    ru: { title: 'Перемешать и Открыть все', description: '«Перемешать заново» начинает новый раунд рубашкой вверх, а «Открыть все» показывает все оставшиеся карты.' },
    es: { title: 'Mezclar y Revelar', description: 'Mezclar y reiniciar empieza otra ronda boca abajo; Revelar todas muestra las cartas restantes.' },
    de: { title: 'Mischen & Alle aufdecken', description: 'Mischen & Neu startet eine neue verdeckte Runde; Alle aufdecken zeigt die übrigen Karten.' },
    fr: { title: 'Mélanger & Tout révéler', description: 'Relancez une manche face cachée ou révélez toutes les cartes restantes.' },
  },
  diceStage: {
    en: { title: 'Dice Arena & Click-to-Hold', description: 'After rolling, click any die to lock/hold its value for your next roll—great for Yahtzee-style rerolls!' },
    ru: { title: 'Арена костей и фиксация', description: 'После броска нажмите на любой кубик, чтобы зафиксировать его и перебросить только остальные.' },
    es: { title: 'Mesa de dados y bloqueo', description: 'Tras lanzar, pulsa cualquier dado para bloquearlo y volver a tirar solo los demás.' },
    de: { title: 'Würfel-Arena & Fixieren', description: 'Klicke nach dem Wurf auf beliebige Würfel, um sie für den nächsten Wurf festzuhalten.' },
    fr: { title: 'Zone de dés & Verrou', description: 'Après un lancer, cliquez sur un dé pour le verrouiller avant de relancer les autres.' },
  },
  diceAction: {
    en: { title: 'Roll Dice Button', description: 'Rolls all unlocked dice, displays the total sum, and gives you a Copy Result button.' },
    ru: { title: 'Бросить кости', description: 'Бросает незафиксированные кубики, считает сумму и даёт кнопку копирования результата.' },
    es: { title: 'Lanzar Dados', description: 'Lanza los dados libres, suma el total y permite copiar el resultado.' },
    de: { title: 'Würfeln-Button', description: 'Wirft alle freien Würfel, berechnet die Summe und bietet eine Kopier-Funktion.' },
    fr: { title: 'Lancer les dés', description: 'Lance les dés déverrouillés, calcule le total et permet de copier le résultat.' },
  },
  diceType: {
    en: { title: 'Dice Type (D4–D20)', description: 'Switch between classic 6-sided cubes (D6) and polyhedral RPG dice (D4, D8, D10, D12, D20).' },
    ru: { title: 'Тип кубика (D4–D20)', description: 'Переключайтесь между обычными кубиками D6 и ролевыми многогранниками D4–D20.' },
    es: { title: 'Tipo de dado (D4–D20)', description: 'Cambia entre dados clásicos D6 y dados poliédricos D4, D8, D10, D12 o D20.' },
    de: { title: 'Würfeltyp (W4–W20)', description: 'Wähle zwischen klassischen W6-Würfeln und RPG-Würfeln von W4 bis W20.' },
    fr: { title: 'Type de dé (D4–D20)', description: 'Choisissez entre les dés D6 classiques et les dés polyédriques D4 à D20.' },
  },
  diceCount: {
    en: { title: 'Number of Dice', description: 'Pick from 1 up to 6 dice to roll together.' },
    ru: { title: 'Количество костей', description: 'Выберите от 1 до 6 кубиков для одновременного броска.' },
    es: { title: 'Cantidad de dados', description: 'Elige entre 1 y 6 dados para lanzar a la vez.' },
    de: { title: 'Anzahl Würfel', description: 'Wähle 1 bis 6 Würfel für jeden Wurf.' },
    fr: { title: 'Nombre de dés', description: 'Sélectionnez de 1 à 6 dés à lancer ensemble.' },
  },
  diceModifier: {
    en: { title: 'Modifier (-10 to +10)', description: 'Add a positive or negative bonus to the total roll sum.' },
    ru: { title: 'Модификатор (-10 до +10)', description: 'Добавляет или вычитает фиксированное число из итоговой суммы.' },
    es: { title: 'Modificador (-10 a +10)', description: 'Suma o resta un bono fijo al resultado total.' },
    de: { title: 'Modifikator (-10 bis +10)', description: 'Addiert oder subtrahiert einen festen Bonus zur Gesamtsumme.' },
    fr: { title: 'Modificateur (-10 à +10)', description: 'Ajoute ou retire un bonus fixe au total des dés.' },
  },
  coinStage: {
    en: { title: '3D Coin Stage', description: 'Click the coin directly (or press Space) to toss it in 3D. Results appear below with a Copy button.' },
    ru: { title: '3D Монета', description: 'Нажмите прямо на монету (или Пробел) для броска. Результат можно скопировать в 1 клик.' },
    es: { title: 'Moneda 3D', description: 'Toca la moneda directamente (o Espacio) para lanzarla. El resultado incluye botón de copia.' },
    de: { title: '3D-Münze', description: 'Klicke direkt auf die Münze (oder Leertaste) zum Werfen.' },
    fr: { title: 'Pièce 3D', description: 'Cliquez sur la pièce (ou Espace) pour la lancer et copier le résultat.' },
  },
  coinStyle: {
    en: { title: 'Coin Style & Custom Text', description: 'Choose Heads/Tails, Dollar/Euro, Yes/No, or Custom Text to put any two choices on each side of the coin!' },
    ru: { title: 'Стиль монеты и свой текст', description: 'Выберите Орёл/Решка, Валюты, Да/Нет или «Свой вариант», чтобы написать любой текст на обеих сторонах!' },
    es: { title: 'Estilo de moneda', description: 'Elige Cara/Cruz, Dólar/Euro, Sí/No o Texto personalizado para escribir tus propias opciones.' },
    de: { title: 'Münzstil & eigener Text', description: 'Wähle Kopf/Zahl, Währung, Ja/Nein oder eigenen Text für beide Seiten.' },
    fr: { title: 'Style de pièce', description: 'Choisissez Pile/Face, Devise, Oui/Non ou Texte personnalisé.' },
  },
  coinSeries: {
    en: { title: 'Match Format', description: 'Play single flips or race to 2 wins (Best of 3) / 3 wins (Best of 5).' },
    ru: { title: 'Формат матча', description: 'Одиночный бросок или серия до 2 побед (BO3) / до 3 побед (BO5).' },
    es: { title: 'Formato de partida', description: 'Juega a un tiro, al mejor de 3 o al mejor de 5.' },
    de: { title: 'Match-Modus', description: 'Einzelwurf oder Serie (Best of 3 / Best of 5).' },
    fr: { title: 'Format du match', description: 'Tirage simple ou manche gagnante en 3 ou 5 lancers.' },
  },
  shellHud: {
    en: { title: 'Round Status & Streak', description: 'Shows what to do next and tracks your current win streak and all-time best streak.' },
    ru: { title: 'Статус и серия побед', description: 'Показывает подсказку раунда, вашу текущую серию угадываний и рекорд.' },
    es: { title: 'Estado y Racha', description: 'Muestra el paso actual de la ronda y registra tu racha actual y récord.' },
    de: { title: 'Status & Serie', description: 'Zeigt den aktuellen Rundenhinweis sowie deine aktuelle und beste Trefferserie.' },
    fr: { title: 'Statut & Série', description: 'Indique l’étape en cours et suit votre série actuelle et votre record.' },
  },
  shellStage: {
    en: { title: '3D Cup & Ball Table', description: 'Watch the ball hide under a cup, track the swaps (you can drag the table to rotate the angle!), then tap a cup or press 1–6 to guess.' },
    ru: { title: 'Игровой стол 3D', description: 'Запомните, под какой стакан спрятан шарик, следите за обменами (стол можно крутить мышкой) и угадайте стакан!' },
    es: { title: 'Mesa 3D de Vasos', description: 'Observa dónde se esconde la bola, sigue los cambios (arrastra para rotar la vista) y toca un vaso para adivinar.' },
    de: { title: '3D-Hütchen-Tisch', description: 'Merke dir die Kugel, verfolge die Wechsel (Tisch drehbar) und tippe dann auf den richtigen Becher.' },
    fr: { title: 'Table 3D Bonneteau', description: 'Suivez la balle jaune, observez les échanges (vue orientable) et cliquez sur le bon gobelet.' },
  },
  shellAction: {
    en: { title: 'Start & Mix / Play Again', description: 'Starts hiding the ball and mixing the cups. After guessing, click Play Again (or press Space) for the next round.' },
    ru: { title: 'Начать и перемешать', description: 'Прячет шарик и запускает перемешивание. После ответа нажмите «Играть снова» или Пробел.' },
    es: { title: 'Iniciar y Mezclar', description: 'Esconde la bola y mezcla los vasos. Después, pulsa Jugar de nuevo o Espacio.' },
    de: { title: 'Start & Mischen', description: 'Versteckt die Kugel und mischt die Becher. Danach Nochmal spielen klicken.' },
    fr: { title: 'Cacher & Mélanger', description: 'Cache la balle et lance le mélange, puis permet de rejouer en un clic.' },
  },
  shellDifficulty: {
    en: { title: '1-Click Difficulty', description: 'Quickly pick Easy, Normal, Hard, or Insane to configure cups, swaps, and speed automatically.' },
    ru: { title: 'Выбор сложности', description: 'Готовые режимы: Лёгкий, Обычный, Сложный и Безумный меняют число стаканов, ходов и скорость в 1 клик.' },
    es: { title: 'Dificultad en 1 clic', description: 'Elige Fácil, Normal, Difícil o Extremo para ajustar vasos, cambios y velocidad.' },
    de: { title: 'Schwierigkeits-Presets', description: 'Wähle Leicht, Normal, Schwer oder Extrem mit einem Klick.' },
    fr: { title: 'Difficulté rapide', description: 'Choisissez Facile, Normal, Difficile ou Extrême en un clic.' },
  },
  shellCustom: {
    en: { title: 'Custom Cups, Swaps & Speed', description: 'Fine-tune how many cups (3–6), how many swaps (3–25), and how fast they move.' },
    ru: { title: 'Точная настройка игры', description: 'Настройте точное количество стаканов (3–6), число обменов (3–25) и скорость.' },
    es: { title: 'Ajustes personalizados', description: 'Configura la cantidad de vasos (3–6), intercambios (3–25) y velocidad.' },
    de: { title: 'Becher, Wechsel & Tempo', description: 'Passe Becheranzahl (3–6), Wechsel (3–25) und Tempo genau an.' },
    fr: { title: 'Gobelets, échanges & vitesse', description: 'Ajustez le nombre de gobelets (3–6), d’échanges (3–25) et la vitesse.' },
  },
  numberStage: {
    en: { title: 'Number Result Stage', description: 'Displays your generated number(s) cleanly with a 1-click Copy Result button.' },
    ru: { title: 'Окно результата', description: 'Показывает выпавшие числа с кнопкой быстрого копирования.' },
    es: { title: 'Resultado numérico', description: 'Muestra los números generados con botón para copiar al instante.' },
    de: { title: 'Zahlen-Anzeige', description: 'Zeigt die gezogenen Zahlen groß samt 1-Klick-Kopieren.' },
    fr: { title: 'Affichage des nombres', description: 'Affiche les nombres tirés avec un bouton de copie rapide.' },
  },
  numberRange: {
    en: { title: 'Min & Max Range', description: 'Set any minimum and maximum bounds—including zero and negative numbers.' },
    ru: { title: 'Диапазон Мин и Макс', description: 'Задайте любые границы, включая ноль и отрицательные числа.' },
    es: { title: 'Rango Mínimo y Máximo', description: 'Define cualquier límite mínimo y máximo, incluyendo cero y negativos.' },
    de: { title: 'Minimum & Maximum', description: 'Lege beliebige Unter- und Obergrenzen fest (inkl. Null und Minus).' },
    fr: { title: 'Plage Min & Max', description: 'Définissez les bornes minimale et maximale (zéro et négatifs inclus).' },
  },
  numberCount: {
    en: { title: 'Draw Count (1–10)', description: 'Pick how many numbers to generate at once.' },
    ru: { title: 'Количество чисел', description: 'Выберите, сколько чисел сгенерировать за один раз (от 1 до 10).' },
    es: { title: 'Cantidad a extraer', description: 'Elige cuántos números generar a la vez (1–10).' },
    de: { title: 'Anzahl der Ziehungen', description: 'Bestimme, wie viele Zahlen gleichzeitig gezogen werden (1–10).' },
    fr: { title: 'Nombre de tirages', description: 'Choisissez combien de nombres tirer à la fois (1–10).' },
  },
  numberUnique: {
    en: { title: 'No Repeats & Sorting', description: 'Enable Unique Numbers to draw like a lottery pool without repeats, or Sort Ascending to order results.' },
    ru: { title: 'Без повторов и сортировка', description: 'Режим «Без повторений» исключает уже выпавшие числа, а «Сортировать» упорядочивает их по возрастанию.' },
    es: { title: 'Sin repeticiones y orden', description: 'Activa Sin repeticiones para no repetir números ya salidos, u Ordenar de menor a mayor.' },
    de: { title: 'Keine Wiederholungen & Sortieren', description: 'Ziehe wie im Lotto ohne Zurücklegen oder sortiere Ergebnisse aufsteigend.' },
    fr: { title: 'Sans doublons & Tri', description: 'Évitez les répétitions entre tirages ou triez les nombres par ordre croissant.' },
  },
  choiceStage: {
    en: { title: 'Choice / Teams Stage', description: 'Displays either the animated single winner or the randomly split teams—both with a Copy Result button.' },
    ru: { title: 'Результат выбора / Команды', description: 'Показывает одного победителя или готовые случайные команды с кнопкой копирования.' },
    es: { title: 'Resultado o Equipos', description: 'Muestra el ganador elegido o los equipos aleatorios listos para copiar.' },
    de: { title: 'Auswahl / Team-Anzeige', description: 'Zeigt entweder den gezogenen Gewinner oder die aufgeteilten Teams zum Kopieren.' },
    fr: { title: 'Résultat ou Équipes', description: 'Affiche le gagnant tiré au sort ou les équipes formées avec bouton de copie.' },
  },
  choiceMode: {
    en: { title: 'Single Pick vs Split Teams', description: 'Switch between picking one winner or dividing your list into 2, 3, or 4 random teams!' },
    ru: { title: 'Один выбор или Команды', description: 'Переключайтесь между выбором одного варианта и делением списка на 2, 3 или 4 случайные команды!' },
    es: { title: 'Elección única o Equipos', description: 'Alterna entre elegir un ganador o dividir la lista en 2, 3 o 4 equipos aleatorios.' },
    de: { title: 'Einzelwahl vs. Teams', description: 'Wechsle zwischen Einzelauswahl und zufälliger Aufteilung in 2–4 Teams.' },
    fr: { title: 'Choix unique ou Équipes', description: 'Basculez entre un tirage unique ou une répartition en 2 à 4 équipes.' },
  },
  passwordStage: {
    en: { title: 'Password & Entropy Meter', description: 'Shows your generated password or passphrase along with its cryptographic entropy score in bits.' },
    ru: { title: 'Пароль и шкала надёжности', description: 'Отображает сгенерированный пароль или фразу и показывает уровень энтропии в битах.' },
    es: { title: 'Contraseña y Entropía', description: 'Muestra tu contraseña o frase generada junto con su nivel de seguridad en bits.' },
    de: { title: 'Passwort & Entropie', description: 'Zeigt das generierte Passwort samt Sicherheitsbewertung in Bit.' },
    fr: { title: 'Mot de passe & Entropie', description: 'Affiche votre mot de passe ou phrase secrète avec son score de robustesse en bits.' },
  },
  passwordActions: {
    en: { title: 'Generate & Copy', description: 'Create a fresh password anytime (or press Space) and copy it cleanly to your clipboard.' },
    ru: { title: 'Сгенерировать и Копировать', description: 'Создайте новый пароль (или нажмите Пробел) и скопируйте его в буфер обмена.' },
    es: { title: 'Generar y Copiar', description: 'Crea una nueva contraseña cuando quieras y cópiala en 1 clic.' },
    de: { title: 'Generieren & Kopieren', description: 'Erstelle jederzeit ein neues Passwort und kopiere es direkt.' },
    fr: { title: 'Générer & Copier', description: 'Créez un nouveau mot de passe à tout moment et copiez-le en 1 clic.' },
  },
  passwordControls: {
    en: { title: 'Mode, Length & Characters', description: 'Switch between random Characters or multi-word Passphrases, adjust length, and toggle uppercase, numbers, or symbols.' },
    ru: { title: 'Режим, длина и символы', description: 'Переключайтесь между набором символов и фразой из слов, меняйте длину и состав символов.' },
    es: { title: 'Modo, longitud y caracteres', description: 'Elige entre caracteres aleatorios o frase de palabras, ajusta la longitud y qué símbolos incluir.' },
    de: { title: 'Modus, Länge & Zeichen', description: 'Wähle Zeichen oder Passphrase, Länge und ob Großbuchstaben, Zahlen oder Symbole enthalten sind.' },
    fr: { title: 'Mode, longueur & caractères', description: 'Choisissez entre caractères aléatoires ou phrase secrète et ajustez les règles.' },
  },
  colorStage: {
    en: { title: 'Interactive Color Canvas', description: 'Preview your generated color with auto-contrasting text. Click the hex code to copy it or press Generate for a new color.' },
    ru: { title: 'Цветовое поле', description: 'Просмотр цвета с контрастным текстом. Нажмите на HEX-код, чтобы скопировать, или «Сгенерировать» для нового цвета.' },
    es: { title: 'Lienzo de Color', description: 'Previsualiza el color con contraste automático. Toca el código HEX para copiarlo o genera uno nuevo.' },
    de: { title: 'Interaktive Farbfläche', description: 'Sieh deine Farbe mit automatischem Kontrast. Klicke den HEX-Code zum Kopieren oder Generieren für neu.' },
    fr: { title: 'Aperçu de Couleur', description: 'Visualisez la couleur avec contraste auto. Cliquez sur le code HEX pour le copier ou générez-en une autre.' },
  },
  colorPalette: {
    en: { title: 'Harmonious 4-Swatch Palette', description: 'Generates Base, Complementary, Analog (+30°), and Tint swatches. Click any swatch to select and copy it.' },
    ru: { title: 'Гармоничная палитра', description: 'Показывает базовый, комплементарный, соседний (+30°) и светлый оттенки. Нажмите на любой, чтобы выбрать и скопировать.' },
    es: { title: 'Paleta armónica', description: 'Muestra tonos Base, Complementario, Análogo y Tinte. Pulsa cualquiera para usarlo y copiarlo.' },
    de: { title: 'Harmonische 4er-Palette', description: 'Erstellt Basis-, Komplementär-, Analog- und Hell-Töne. Klicke einen Ton zum Auswählen & Kopieren.' },
    fr: { title: 'Palette harmonieuse', description: 'Propose 4 nuances assorties : Base, Complémentaire, Analogue et Teinte claire.' },
  },
  colorFormats: {
    en: { title: 'Formats & WCAG Contrast', description: 'Copy HEX, RGB, or HSL in 1 click and verify accessibility contrast against white and dark slate.' },
    ru: { title: 'Форматы и контраст WCAG', description: 'Копируйте HEX, RGB или HSL в 1 клик и проверяйте читаемость на белом и тёмном фоне.' },
    es: { title: 'Formatos y Contraste WCAG', description: 'Copia HEX, RGB o HSL en 1 clic y verifica el contraste sobre blanco y oscuro.' },
    de: { title: 'Formate & WCAG-Kontrast', description: 'Kopiere HEX, RGB oder HSL mit 1 Klick und prüfe den Kontrast gegen Weiß und Dunkel.' },
    fr: { title: 'Formats & Contraste WCAG', description: 'Copiez HEX, RGB ou HSL en 1 clic et vérifiez le ratio de contraste WCAG.' },
  },
  historyInsights: {
    en: { title: 'Probability & Streak Stats', description: 'Analyzes your saved history across games: Coin heads/tails balance, Cup & Ball win rate, Dice distribution, and Top Winners.' },
    ru: { title: 'Статистика и вероятности', description: 'Анализирует всю вашу историю: баланс монетки, точность в напёрстках, распределение кубиков и частых победителей.' },
    es: { title: 'Estadísticas y Probabilidad', description: 'Analiza tu historial: balance de moneda, aciertos en vasos, distribución de dados y ganadores frecuentes.' },
    de: { title: 'Statistik & Wahrscheinlichkeit', description: 'Analysiert deinen Verlauf: Münz-Balance, Hütchenspiel-Quote, Würfelverteilung und Top-Gewinner.' },
    fr: { title: 'Statistiques & Probabilités', description: 'Analyse vos parties : équilibre pièce, réussite bonneteau, distribution des dés et meilleurs gagnants.' },
  },
  historyFilters: {
    en: { title: 'Filter by Game', description: 'View all games mixed chronologically, or click any game tab to filter only its results.' },
    ru: { title: 'Фильтр по играм', description: 'Просматривайте общую ленту или выберите конкретную игру, чтобы отфильтровать результаты.' },
    es: { title: 'Filtrar por juego', description: 'Mira todos los juegos juntos o filtra por un juego concreto.' },
    de: { title: 'Nach Spiel filtern', description: 'Alle Spiele zusammen ansehen oder gezielt nach einem Spiel filtern.' },
    fr: { title: 'Filtrer par jeu', description: 'Affichez tout ou filtrez l’historique d’un seul jeu.' },
  },
  historyList: {
    en: { title: 'History Log & Quick Copy', description: 'Every result is timestamped and saved locally, with a 1-click Copy button on every row.' },
    ru: { title: 'Лента результатов', description: 'Каждый результат сохраняется с точным временем и кнопкой копирования.' },
    es: { title: 'Registro de resultados', description: 'Cada resultado guarda la hora exacta e incluye un botón para copiar.' },
    de: { title: 'Ergebnis-Protokoll', description: 'Jedes Ergebnis wird mit Zeitstempel gespeichert und lässt sich direkt kopieren.' },
    fr: { title: 'Journal des résultats', description: 'Chaque résultat est horodaté et copiable en un clic.' },
  },
};

export function getGuideStepsForContext(
  activeTool: ToolId,
  orderedToolIds: GameToolId[],
  lang: LanguageCode
): GuideStepDef[] {
  if (activeTool === 'dashboard') {
    const steps: GuideStepDef[] = [
      { id: 'guide-toggle', target: '[data-guide="guide-toggle"]', ...pick(MENU_COPY.guideToggle, lang) },
      { id: 'topbar-actions', target: '[data-guide="topbar-actions"]', ...pick(MENU_COPY.topbar, lang) },
      { id: 'sidebar-nav', target: '[data-guide="sidebar-nav"]', ...pick(MENU_COPY.sidebar, lang) },
      { id: 'dashboard-history', target: '[data-guide="dashboard-history"]', ...pick(MENU_COPY.dashHistory, lang) },
      { id: 'fav-heart', target: '[data-guide="dashboard-first-fav"]', ...pick(MENU_COPY.favHeart, lang) },
    ];

    orderedToolIds.forEach((toolId) => {
      steps.push({
        id: `card-${toolId}`,
        target: `[data-guide="dashboard-card-${toolId}"]`,
        ...pick(GAME_CARD_COPY[toolId], lang),
      });
    });

    return steps;
  }

  if (activeTool === 'history') {
    return [
      { id: 'guide-toggle', target: '[data-guide="guide-toggle"]', ...pick(MENU_COPY.guideToggle, lang) },
      { id: 'history-insights', target: '[data-guide="history-insights"]', ...pick(TOOL_SPECIFIC_COPY.historyInsights, lang) },
      { id: 'history-filters', target: '[data-guide="history-filters"]', ...pick(TOOL_SPECIFIC_COPY.historyFilters, lang) },
      { id: 'history-list', target: '[data-guide="history-list"]', ...pick(TOOL_SPECIFIC_COPY.historyList, lang) },
    ];
  }

  const headerEnd: GuideStepDef[] = [
    { id: 'tool-history', target: '[data-guide="tool-history"]', scoped: true, ...pick(SHARED_GAME_COPY.toolHistory, lang) },
    { id: 'game-fav', target: '[data-guide="game-fav-btn"]', ...pick(SHARED_GAME_COPY.gameFav, lang) },
    { id: 'stage-mode', target: '[data-guide="stage-mode-btn"]', ...pick(SHARED_GAME_COPY.stageMode, lang) },
  ];

  switch (activeTool) {
    case 'wheel':
      return [
        { id: 'wheel-stage', target: '[data-guide="wheel-stage"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelStage, lang) },
        { id: 'wheel-action', target: '[data-guide="wheel-action"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelAction, lang) },
        { id: 'saved-presets', target: '[data-guide="saved-presets"]', scoped: true, ...pick(SHARED_GAME_COPY.savedPresets, lang) },
        { id: 'wheel-presets', target: '[data-guide="wheel-presets"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelPresets, lang) },
        { id: 'wheel-options', target: '[data-guide="wheel-options"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelOptions, lang) },
        { id: 'repeat-count', target: '[data-guide="repeat-count"]', scoped: true, ...pick(SHARED_GAME_COPY.repeatCount, lang) },
        { id: 'wheel-duration', target: '[data-guide="wheel-duration"]', scoped: true, ...pick(SHARED_GAME_COPY.duration, lang) },
        { id: 'wheel-eliminate', target: '[data-guide="wheel-eliminate"]', scoped: true, ...pick(SHARED_GAME_COPY.eliminate, lang) },
        ...headerEnd,
      ];
    case 'roulette':
      return [
        { id: 'roulette-stage', target: '[data-guide="roulette-stage"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.rouletteStage, lang) },
        { id: 'roulette-action', target: '[data-guide="roulette-action"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.rouletteAction, lang) },
        { id: 'saved-presets', target: '[data-guide="saved-presets"]', scoped: true, ...pick(SHARED_GAME_COPY.savedPresets, lang) },
        { id: 'roulette-presets', target: '[data-guide="roulette-presets"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelPresets, lang) },
        { id: 'roulette-options', target: '[data-guide="roulette-options"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelOptions, lang) },
        { id: 'repeat-count', target: '[data-guide="repeat-count"]', scoped: true, ...pick(SHARED_GAME_COPY.repeatCount, lang) },
        { id: 'roulette-eliminate', target: '[data-guide="roulette-eliminate"]', scoped: true, ...pick(SHARED_GAME_COPY.eliminate, lang) },
        ...headerEnd,
      ];
    case 'bottle':
      return [
        { id: 'bottle-stage', target: '[data-guide="bottle-stage"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.bottleStage, lang) },
        { id: 'bottle-action', target: '[data-guide="bottle-action"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.bottleAction, lang) },
        { id: 'saved-presets', target: '[data-guide="saved-presets"]', scoped: true, ...pick(SHARED_GAME_COPY.savedPresets, lang) },
        { id: 'bottle-presets', target: '[data-guide="bottle-presets"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelPresets, lang) },
        { id: 'bottle-options', target: '[data-guide="bottle-options"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelOptions, lang) },
        { id: 'repeat-count', target: '[data-guide="repeat-count"]', scoped: true, ...pick(SHARED_GAME_COPY.repeatCount, lang) },
        { id: 'bottle-duration', target: '[data-guide="bottle-duration"]', scoped: true, ...pick(SHARED_GAME_COPY.duration, lang) },
        { id: 'bottle-eliminate', target: '[data-guide="bottle-eliminate"]', scoped: true, ...pick(SHARED_GAME_COPY.eliminate, lang) },
        ...headerEnd,
      ];
    case 'cards':
      return [
        { id: 'cards-stage', target: '[data-guide="cards-stage"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.cardsStage, lang) },
        { id: 'cards-actions', target: '[data-guide="cards-actions"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.cardsActions, lang) },
        { id: 'saved-presets', target: '[data-guide="saved-presets"]', scoped: true, ...pick(SHARED_GAME_COPY.savedPresets, lang) },
        { id: 'cards-presets', target: '[data-guide="cards-presets"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelPresets, lang) },
        { id: 'cards-options', target: '[data-guide="cards-options"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelOptions, lang) },
        { id: 'cards-eliminate', target: '[data-guide="cards-eliminate"]', scoped: true, ...pick(SHARED_GAME_COPY.eliminate, lang) },
        ...headerEnd,
      ];
    case 'dice':
      return [
        { id: 'dice-stage', target: '[data-guide="dice-stage"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.diceStage, lang) },
        { id: 'dice-action', target: '[data-guide="dice-action"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.diceAction, lang) },
        { id: 'dice-type', target: '[data-guide="dice-type"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.diceType, lang) },
        { id: 'dice-count', target: '[data-guide="dice-count"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.diceCount, lang) },
        { id: 'dice-modifier', target: '[data-guide="dice-modifier"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.diceModifier, lang) },
        { id: 'repeat-count', target: '[data-guide="repeat-count"]', scoped: true, ...pick(SHARED_GAME_COPY.repeatCount, lang) },
        ...headerEnd,
      ];
    case 'coin':
      return [
        { id: 'coin-stage', target: '[data-guide="coin-stage"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.coinStage, lang) },
        { id: 'coin-action', target: '[data-guide="coin-action"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelAction, lang) },
        { id: 'coin-style', target: '[data-guide="coin-style"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.coinStyle, lang) },
        { id: 'coin-series', target: '[data-guide="coin-series"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.coinSeries, lang) },
        { id: 'repeat-count', target: '[data-guide="repeat-count"]', scoped: true, ...pick(SHARED_GAME_COPY.repeatCount, lang) },
        ...headerEnd,
      ];
    case 'shell':
      return [
        { id: 'shell-hud', target: '[data-guide="shell-hud"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.shellHud, lang) },
        { id: 'shell-stage', target: '[data-guide="shell-stage"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.shellStage, lang) },
        { id: 'shell-action', target: '[data-guide="shell-action"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.shellAction, lang) },
        { id: 'shell-difficulty', target: '[data-guide="shell-difficulty"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.shellDifficulty, lang) },
        { id: 'shell-custom', target: '[data-guide="shell-custom"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.shellCustom, lang) },
        ...headerEnd,
      ];
    case 'number':
      return [
        { id: 'number-stage', target: '[data-guide="number-stage"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.numberStage, lang) },
        { id: 'number-action', target: '[data-guide="number-action"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelAction, lang) },
        { id: 'number-range', target: '[data-guide="number-range"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.numberRange, lang) },
        { id: 'number-count', target: '[data-guide="number-count"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.numberCount, lang) },
        { id: 'number-unique', target: '[data-guide="number-unique"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.numberUnique, lang) },
        ...headerEnd,
      ];
    case 'choice':
      return [
        { id: 'choice-stage', target: '[data-guide="choice-stage"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.choiceStage, lang) },
        { id: 'choice-action', target: '[data-guide="choice-action"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelAction, lang) },
        { id: 'saved-presets', target: '[data-guide="saved-presets"]', scoped: true, ...pick(SHARED_GAME_COPY.savedPresets, lang) },
        { id: 'choice-mode', target: '[data-guide="choice-mode"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.choiceMode, lang) },
        { id: 'choice-options', target: '[data-guide="choice-options"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.wheelOptions, lang) },
        { id: 'repeat-count', target: '[data-guide="repeat-count"]', scoped: true, ...pick(SHARED_GAME_COPY.repeatCount, lang) },
        { id: 'choice-eliminate', target: '[data-guide="choice-eliminate"]', scoped: true, ...pick(SHARED_GAME_COPY.eliminate, lang) },
        ...headerEnd,
      ];
    case 'password':
      return [
        { id: 'password-stage', target: '[data-guide="password-stage"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.passwordStage, lang) },
        { id: 'password-actions', target: '[data-guide="password-actions"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.passwordActions, lang) },
        { id: 'password-controls', target: '[data-guide="password-controls"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.passwordControls, lang) },
        ...headerEnd,
      ];
    case 'color':
      return [
        { id: 'color-stage', target: '[data-guide="color-stage"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.colorStage, lang) },
        { id: 'color-palette', target: '[data-guide="color-palette"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.colorPalette, lang) },
        { id: 'color-formats', target: '[data-guide="color-formats"]', scoped: true, ...pick(TOOL_SPECIFIC_COPY.colorFormats, lang) },
        ...headerEnd,
      ];
  }
}
