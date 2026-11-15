import { useState, useEffect } from 'react';
import { readStoredSettings } from '../constants/settings';

const UNVERIFIED_TEXT = {
  en: 'Unconfirmed in the sources we reviewed',
  ar: 'غير مؤكد في المصادر التي راجعناها',
};

const L = (en, ar = '') => ({ en, ar });

/**
 * Shared verified NASA reference list used across dossier cards, archive cards,
 * and SourcesModal. Update `accessed` dates when re-verifying against live pages.
 */
export const CRAFT_SOURCES = [
  {
    id: 'nasa-lrv',
    label: L(
      'NASA — Apollo Lunar Roving Vehicle (LRV) Overview',
      'ناسا — نظرة عامة على عربة استكشاف القمر (LRV) لبرنامج أبولو'
    ),
    url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html',
    accessed: '2026-04-15',
  },
  {
    id: 'nasa-heritage-2011',
    label: L(
      "NASA's Recommendations to Space-Faring Entities: How to Protect and Preserve the Historic and Scientific Value of U.S. Government Lunar Artifacts (2011)",
      'توصيات ناسا للكيانات الفضائية: كيفية حماية والحفاظ على القيمة التاريخية والعلمية لآثار الحكومة الأمريكية على القمر (2011)'
    ),
    url: 'https://www.nasa.gov/wp-content/uploads/2023/04/617743main_nasa-usg_lunar_historic_sites_revA-508.pdf',
    accessed: '2026-04-15',
  },
  {
    id: 'nasa-opportunity',
    label: L(
      'NASA JPL — Mars Exploration Rover Opportunity Mission Page',
      'مختبر الدفع النفاث التابع لناسا — صفحة مهمة مركبة استكشاف المريخ أوبورتيونيتي'
    ),
    url: 'https://science.nasa.gov/mission/mer-opportunity/',
    accessed: '2026-04-15',
  },
  {
    id: 'nasa-ingenuity',
    label: L(
      'NASA JPL — Ingenuity Mars Helicopter Mission Reference (Pending Full Fact Audit)',
      'مختبر الدفع النفاث التابع لناسا — مرجع مهمة مروحية المريخ إنجينويتي'
    ),
    url: 'https://science.nasa.gov/mission/mars-2020-ingenuity/',
    accessed: '2026-11-12',
  },
  {
    id: 'nasa-viking1',
    label: L(
      'NASA — Viking 1 Lander Mission Reference (Pending Full Fact Audit)',
      'ناسا — مرجع مهمة مركبة الهبوط فايكنغ 1'
    ),
    url: 'https://science.nasa.gov/mission/viking-1/',
    accessed: '2026-11-12',
  },
  {
    id: 'nasa-voyager',
    label: L(
      'NASA JPL — Voyager Interstellar Mission Status',
      'مختبر الدفع النفاث التابع لناسا — حالة مهمة فوياجر بين النجوم'
    ),
    url: 'https://science.nasa.gov/mission/voyager/',
    accessed: '2026-04-15',
  },
  {
    id: 'nasa-new-horizons',
    label: L(
      'NASA — New Horizons Kuiper Belt Mission Status',
      'ناسا — حالة مهمة نيوهورايزونز في حزام كايبر'
    ),
    url: 'https://science.nasa.gov/mission/new-horizons/',
    accessed: '2026-07-15',
  },
  {
    id: 'nasa-apollo-lm',
    label: L(
      'NASA — Apollo Lunar Module Mission Overview',
      'ناسا — نظرة عامة على مهمة وحدة أبولو القمرية'
    ),
    url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/cslm.html',
    accessed: '2026-11-13',
  },
  {
    id: 'nasa-insight',
    label: L(
      'NASA JPL — InSight Mission Reference & Status',
      'مختبر الدفع النفاث التابع لناسا — مرجع وحالة مهمة إنسايت'
    ),
    url: 'https://science.nasa.gov/mission/insight/',
    accessed: '2026-11-13',
  },
  {
    id: 'nasa-lro',
    label: L(
      'NASA — Lunar Reconnaissance Orbiter (LRO) Overview',
      'ناسا — نظرة عامة على مسبار استكشاف القمر المداري (LRO)'
    ),
    url: 'https://science.nasa.gov/mission/lro/',
    accessed: '2026-11-13',
  },
];

const SOURCE_BY_ID = Object.fromEntries(CRAFT_SOURCES.map((src) => [src.id, src]));

/**
 * Primary bilingual craft stories matching 3D showroom IDs (`VEHICLES_DATA`)
 * plus 2D archive equipment entries rendered inside `MoreEquipmentModal`.
 *
 * Editorial rules enforced in copy:
 * - Never refer to remaining mission equipment as "junk" or "scrap"
 * - Never call lunar/Martian surface craft "orbital debris"
 * - Never equate evidence of past liquid water with confirmed life
 * - Show "Unconfirmed in the sources we reviewed" wherever facts are pending verification
 */
export const CRAFT_STORIES = {
  'lunar-rover': {
    id: 'lunar-rover',
    name: L('Lunar Roving Vehicle (LRV)', 'عربة استكشاف القمر (LRV)'),
    operator: L('NASA (Apollo Program)', 'وكالة ناسا (برنامج أبولو)'),
    location: 'moon',
    launch: L('Apollo 15, 16, and 17 (1971–1972)', 'أبولو 15 و16 و17 (1971–1972)'),
    landing: L('Hadley-Apennine, Descartes, and Taurus-Littrow (Apollo 15–17)', 'هادلي أبينين، ديكارت، وتوروس ليترو (أبولو 15–17)'),
    status: 'halted',
    statusNote: L(
      'Halted historic mission relic parked on the lunar surface after crew departure.',
      'أثر تاريخي لمهمة متوقفة متمركز على سطح القمر بعد مغادرة طواقم الرواد.'
    ),
    lastVerified: '2026-04-15',
    story: {
      question: L(
        'How could astronauts travel beyond walking distance to sample diverse lunar geology within strict suit life-support limits?',
        'كيف يمكن لرواد الفضاء تجاوز مسافة السير على الأقدام لأخذ عينات جيولوجية قمرية متنوعة ضمن حدود دعم الحياة الصارمة لبذلاتهم؟'
      ),
      device: L(
        'An electric, four-wheel-drive folding vehicle stowed in the Lunar Module descent bay for the final three Apollo missions.',
        'مركبة كهربائية رباعية الدفع قابلة للطي وُضعت في حجرة هبوط مركبة الهبوط القمرية لآخر ثلاث مهمات من برنامج أبولو.'
      ),
      experiment: L(
        'Crew drove between crater rims and highland slopes, hauling geology tools, core tubes, and lunar rock boxes back to the lander.',
        'قاد الطاقم المركبة بين حواف الفوهات ومنحدرات المرتفعات، حاملين أدوات الجيولوجيا وأنابيب العينات وصناديق الصخور القمرية إلى مركبة الهبوط.'
      ),
      discovery: L(
        'Extending traverse range across Apollo 15, 16, and 17 let crews collect varied highland and volcanic samples that reshaped models of lunar history.',
        'أتاح توسيع نطاق التنقل عبر مهمات أبولو 15 و16 و17 جمع عينات متنوعة من المرتفعات والبراكين أعادت صياغة نماذج التاريخ القمري.'
      ),
      ending: L(
        'All three LRVs remain powered down on the Moon because they were engineered only for surface mobility and never designed to return to Earth.',
        'لا تزال جميع العربات القمرية الثلاث متوقفة ومستقرة على القمر لأنها صُممت حصرياً للتنقل السطحي ولم تكن مهيأة أبداً للعودة إلى الأرض.'
      ),
    },
    quiz: {
      prompt: L(
        'Why were the three Apollo Lunar Roving Vehicles left parked on the Moon?',
        'لماذا تُرِكت عربات استكشاف القمر الثلاث لبرنامج أبولو متوقفة على سطح القمر؟'
      ),
      options: [
        L(
          'They were never designed to launch back to Earth and stayed as remaining mission hardware.',
          'لم تكن مصممة للإطلاق نحو الأرض وظلت كعتاد باقٍ من المهمات التاريخية.'
        ),
        L(
          'They were deliberately abandoned mid-mission due to total wheel failure.',
          'تم التخلي عنها عمداً أثناء المهمة بسبب تعطل كامل في العجلات.'
        ),
        L(
          'International law required every vehicle to remain running autonomously.',
          'ألزم القانون الدولي كل مركبة بأن تظل تعمل بشكل ذاتي ومستقل.'
        ),
      ],
      correctIndex: 0,
      explanation: L(
        'Each electric LRV was built specifically to extend astronaut exploration range on Apollo 15, 16, and 17. Once the ascent stage lifted off, the remaining equipment stayed on the surface.',
        'بُنيت كل عربة كهربائية خصيصاً لتوسيع مدى استكشاف الرواد في أبولو 15 و16 و17. وفور إقلاع مرحلة الصعود، بقي العتاد المتبقي ثابتاً على السطح.'
      ),
    },
    visitDecision: {
      prompt: L('DO WE APPROACH THE INSTRUMENT?', 'هل نقترب من هذه الآلة التاريخية؟'),
      approachOutcome: L(
        'Approaching closely could disturb delicate tracks and stir abrasive lunar dust onto historic cameras and metal surfaces. NASA’s 2011 Lunar Heritage guidance recommends keep-out buffer distances — note that these are technical preservation recommendations, not binding international law.',
        'الاقتراب الشديد قد يُتلف آثار العجلات الدقيقة ويثير غبار القمر الكاشط على الكاميرات والأسطح المعدنية التاريخية. توصي إرشادات التراث القمري لناسا (2011) بمسافات عازلة كإرشادات فنية استشارية.'
      ),
      keepDistanceOutcome: L(
        'Good preservation choice. Keeping a safe standoff honors NASA’s 2011 Lunar Heritage technical recommendations (non-binding guidance) so future teams can still study dust coating and untouched boot and wheel tracks.',
        'خيار حفظ ممتاز. الحفاظ على مسافة آمنة يحترم توصيات ناسا الفنية للتراث القمري لعام 2011 ليتمكن الباحثون مستقبلاً من دراسة طبقات الغبار والآثار البكر.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-lrv'], SOURCE_BY_ID['nasa-heritage-2011']],
  },

  'mer-opportunity': {
    id: 'mer-opportunity',
    name: L('Opportunity (MER-B)', 'أوبورتيونيتي (MER-B)'),
    operator: L('NASA / Jet Propulsion Laboratory', 'ناسا / مختبر الدفع النفاث'),
    location: 'mars',
    launch: L('7 Jul 2003', '7 يوليو 2003'),
    landing: L('24 Jan 2004', '24 يناير 2004'),
    status: 'halted',
    statusNote: L(
      'Halted spacecraft: planned for ~90 sols, operated nearly 15 years; last contact 10 Jun 2018; mission concluded 13 Feb 2019.',
      'مركبة متوقفة: كان مخططاً لها 90 يوماً مريخياً، وعملت نحو 15 عاماً؛ آخر اتصال في 10 يونيو 2018؛ اختُتمت المهمة في 13 فبراير 2019.'
    ),
    lastVerified: '2026-04-15',
    story: {
      question: L(
        'Did Meridiani Planum once hold surface or subsurface liquid water capable of altering Martian rocks?',
        'هل احتوت سهول ميريدياني بلانوم في الماضي على مياه سائلة سطحية أو جوفية قادرة على تغيير صخور المريخ؟'
      ),
      device: L(
        'A six-wheeled solar-powered geology rover equipped with panoramic cameras, spectrometers, and a rock abrasion tool.',
        'مركبة جيولوجية بست عجلات تعمل بالطاقة الشمسية ومجهزة بكاميرات بانورامية ومطياف وأداة لحك الصخور.'
      ),
      experiment: L(
        'Opportunity drove 45.16 km across craters and bedrock outcrops — the first human-made vehicle to exceed marathon distance on another world.',
        'قطعت أوبورتيونيتي مسافة 45.16 كم عبر الفوهات والنتوءات الصخرية — لتكون أول مركبة من صنع الإنسان تتجاوز مسافة الماراثون على عالم آخر.'
      ),
      discovery: L(
        'Iron-rich hematite spherules and sulfate deposits provided strong evidence of past liquid water conditions that could have been hospitable to microbial life (it did not detect life).',
        'قدمت كرات الهيماتيت الغنية بالحديد وترسبات الكبريتات أدلة قاطعة على وجود مياه سائلة في الماضي ربما كانت ملائمة للحياة الميكروبية (لم تكتشف المركبة حياة).'
      ),
      ending: L(
        'A planet-encircling 2018 dust storm blocked sunlight to its solar arrays; after last contact on 10 Jun 2018 and over 1,000 unanswered recovery commands, NASA concluded the mission on 13 Feb 2019.',
        'حجبت عاصفة ترابية كوكبية عام 2018 ضوء الشمس عن ألواحها؛ وبعد أكثر من 1000 أمر استرداد دون رد، اختتمت ناسا المهمة رسمياً في 13 فبراير 2019.'
      ),
    },
    quiz: {
      prompt: L(
        'What did Opportunity’s hematite and rock chemistry findings actually show about Mars?',
        'ما الذي أظهرته اكتشافات الهيماتيت وكيمياء الصخور بواسطة أوبورتيونيتي حول المريخ؟'
      ),
      options: [
        L(
          'They confirmed living microbes currently inhabit Meridiani Planum craters.',
          'أكدت وجود ميكروبات حية تقطن فوهات ميريدياني بلانوم حالياً.'
        ),
        L(
          'They revealed evidence of past water conditions that may have supported microbial life, though no life was found.',
          'كشفت عن أدلة لظروف مائية سابقة ربما دعمت الحياة الميكروبية، مع عدم العثور على حياة.'
        ),
        L(
          'They proved Mars never experienced liquid water on its surface.',
          'أثبتت أن المريخ لم يشهد قط وجود مياه سائلة على سطحه.'
        ),
      ],
      correctIndex: 1,
      explanation: L(
        'Past habitability is not the same as proof of life. Opportunity established that Meridiani Planum experienced ancient liquid water, showing conditions once favorable for microbes without finding life itself.',
        'القابلية السابقة للسكن ليست إثباتاً لوجود الحياة. أثبتت أوبورتيونيتي وجود مياه سائلة قديمة وهيأت ظروفاً كانت مناسبة للميكروبات دون العثور على حياة.'
      ),
    },
    visitDecision: {
      prompt: L('DO WE APPROACH THE INSTRUMENT?', 'هل نقترب من هذه الآلة التاريخية؟'),
      approachOutcome: L(
        'Driving right up to a halted rover risks throwing dust over untouched solar decks or snagging fragile appendages. Keeping clear — similar in spirit to NASA’s 2011 lunar technical recommendations, which remain advisory rather than binding treaty law — preserves long-term weathering clues in Perseverance Valley.',
        'الاقتراب المباشر من المركبة المتوقفة يهدد بقذف الغبار فوق ألواحها الشمسية. البقاء على مسافة احترام يحافظ على أدلة التجوية طويلة الأمد في وادي بيرسيفيرانس.'
      ),
      keepDistanceOutcome: L(
        'Observing from a respectful standoff protects Opportunity as a mission relic while letting scientists track Martian wind and dust changes around a stationary reference point.',
        'المراقبة من مسافة احترام تحمي أوبورتيونيتي كأثر للمهمة وتسمح للعلماء بتتبع حركة الرياح والغبار حول نقطة مرجعية ثابتة.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-opportunity'], SOURCE_BY_ID['nasa-heritage-2011']],
  },

  'ingenuity-helicopter': {
    id: 'ingenuity-helicopter',
    name: L('Ingenuity Mars Helicopter', 'مروحية إنجينويتي المريخية'),
    operator: L('NASA / Jet Propulsion Laboratory', 'ناسا / مختبر الدفع النفاث'),
    location: 'mars',
    launch: L('July 30, 2020 (Cape Canaveral)', '30 يوليو 2020 (كيب كانافيرال)'),
    landing: L('February 18, 2021 (Jezero Crater, Mars)', '18 فبراير 2021 (فوهة جيزيرو، المريخ)'),
    status: 'halted',
    statusNote: L(
      'Halted historic rotorcraft: planned for 5 demo flights over 30 days; completed 72 historic flights over nearly 3 years before retiring on January 25, 2024.',
      'مروحية تاريخية متوقفة: صُممت لخمس رحلات تجريبية خلال 30 يوماً؛ وأنجزت 72 رحلة على مدار 3 سنوات تقريباً قبل تقاعدها في 25 يناير 2024.'
    ),
    lastVerified: '2026-11-14',
    story: {
      question: L(
        'Can an autonomous rotorcraft achieve powered, controlled aerodynamic flight in Mars’s ultra-thin atmosphere (less than 1% of Earth’s atmospheric density)?',
        'هل تستطيع طائرة مروحية ذاتية التحكم تحقيق طيران ديناميكي هوائي في غلاف المريخ فائق الرقة (أقل من 1% من كثافة هواء الأرض)؟'
      ),
      device: L(
        'A lightweight 1.8-kg coaxial drone with twin counter-rotating carbon-fiber rotors spinning at ~2,400 RPM, onboard solar arrays, and high-performance smartphone processors.',
        'طائرة مسيرة خفيفة بوزن 1.8 كغ ذات دوارين متعاكسين من ألياف الكربون يدوران بسرعة ~2400 دورة/دقيقة، وألواح شمسية وبطاريات ومعالجات متطورة.'
      ),
      experiment: L(
        'Conducted 72 powered flights across Jezero Crater, flying over 17 kilometers, reaching altitudes up to 24 meters, and scouting travel routes for the Perseverance rover.',
        'أنجزت 72 رحلة طيران ناجحة عبر فوهة جيزيرو، قاطعة مسافة تفوق 17 كم، ومحققة ارتفاعات تصل إلى 24 متراً، واستطلعت مسارات القيادة لروفر بيرسيفيرانس.'
      ),
      discovery: L(
        'Proved powered aerodynamic flight is possible on another world, scouted inaccessible rocky terrain from above, and pioneered the future of planetary aerial exploration.',
        'أثبتت إمكانية الطيران الآلي على كوكب آخر، واستطلعت التضاريس الصخرية الوعرة من الأعلى، ومهدت الطريق لمستقبل الاستكشاف الجوي للكواكب.'
      ),
      ending: L(
        'On Flight 72 in January 2024, it sustained damage to its rotor blade tips during an emergency landing in featureless sand dunes; remains permanently preserved at "Valinor Hills".',
        'في رحلتها رقم 72 في يناير 2024، تعرضت أطراف شفرات الدوار لأضرار أثناء هبوط اضطراري في كثبان رملية؛ وبقيت محفوظة بشكل دائم في "تلال فالينور".'
      ),
    },
    quiz: {
      prompt: L('How many flights did the Ingenuity helicopter complete on Mars before concluding its mission?', 'كم عدد الرحلات التي أنجزتها مروحية إنجينويتي على المريخ قبل اختتام مهمتها؟'),
      options: [
        L('72 flights, operating nearly 3 years and flying over 17 kilometers.', '72 رحلة، عاملة لما يقرب من 3 سنوات وقاطعة مسافة تفوق 17 كم.'),
        L('Only 1 single brief hover before motor failure.', 'رحلة اختبار واحدة فقط قبل تعطل المحرك مباشرة.'),
        L('500 flights across both poles of Mars.', '500 رحلة عبر قطبي المريخ.'),
      ],
      correctIndex: 0,
      explanation: L(
        'Originally designed as a brief 30-day technology demonstration with 5 planned flights, Ingenuity surpassed all expectations, executing 72 historic flights across Mars.',
        'صُممت أصلاً كتجربة تكنولوجية مدتها 30 يوماً تتضمن 5 رحلات فقط، لكن إنجينويتي فاقت التوقعات ونفذت 72 رحلة تاريخية عبر المريخ.'
      ),
    },
    visitDecision: {
      prompt: L('DO WE APPROACH THE INSTRUMENT?', 'هل نقترب من المركبة؟'),
      approachOutcome: L(
        'Approaching closely risks stirring sand onto the delicate solar panel and carbon rotors. Maintaining distance honors planetary heritage standards.',
        'الاقتراب الشديد قد يثير الرمال نحو اللوح الشمسي وشفرات الكربون الحساسة. الحفاظ على مسافة يحمي التراث الكوكبي.'
      ),
      keepDistanceOutcome: L(
        'Maintaining a respectful perimeter preserves the historic first aircraft to fly on an alien world untouched for future generations.',
        'الحفاظ على مسافة احترام يحفظ أول طائرة حلقت في سماء عالم آخر دون مساس للأجيال القادمة.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-ingenuity']],
  },

  'viking-lander': {
    id: 'viking-lander',
    name: L('Viking 1 Lander', 'مركبة هبوط فايكنغ 1'),
    operator: L('NASA (Langley & JPL)', 'ناسا (مركز لانغلي ومختبر الدفع النفاث)'),
    location: 'mars',
    launch: L('August 20, 1975', '20 أغسطس 1975'),
    landing: L('July 20, 1976 (Chryse Planitia, Mars)', '20 يوليو 1976 (سهل خريسي، المريخ)'),
    status: 'halted',
    statusNote: L(
      'Halted historic surface lander: first successful long-duration science station on Mars; operated until November 11, 1982.',
      'محطة هبوط تاريخية متوقفة: أول محطة علمية ناجحة طويلة الأمد على المريخ؛ عملت حتى 11 نوفمبر 1982.'
    ),
    lastVerified: '2026-11-14',
    story: {
      question: L(
        'Does the surface soil of Mars contain microscopic biological metabolism, organic molecules, or active chemical weathering?',
        'هل تحتوي تربة المريخ الحمراء على تمثيل غذائي حيوي مجهري، أو جزيئات عضوية، أو تفاعلات تجوية كيميائية نشطة؟'
      ),
      device: L(
        'An automated lander powered by dual radioisotope thermoelectric generators (RTGs), carrying color cameras, meteorology booms, a robotic trenching arm, and three biological test chambers.',
        'مركبة هبوط آلية تعمل بمولدين نوويين حراريين (RTG)، تحمل كاميرات تصوير بالألوان، مجسات أرصاد جوية، ذراع حفر آلية، وثلاث غرف تجارب بيولوجية.'
      ),
      experiment: L(
        'Scooped surface regolith and performed pyrolytic release, labeled release, and gas exchange experiments while monitoring daily Martian winds, pressure, and weather for over 6 years (2,307 Earth days).',
        'أخذت عينات من التربة وأجرت تجارب الانبعاث الحراري والتحلل الإشعاعي وتبادل الغازات مع مراقبة الرياح والضغط والطقس لأكثر من 6 سنوات (2307 يوماً أرضياً).'
      ),
      discovery: L(
        'Delivered humanity’s first clear color panoramas from the surface of Mars, characterized the rust-red atmosphere, and proved Martian soil is chemically hyper-oxidizing (which mimicked biological reactions without organic carbon).',
        'قدمت للبشرية أول بانوراما ملونة واضحة من سطح المريخ، ووصفت الغلاف الجوي الصدئ، وأثبتت أن التربة شديدة التأكسد كيميائياً (مما حاكى التفاعلات الحيوية دون وجود كربون عضوي).'
      ),
      ending: L(
        'Operated faithfully until November 11, 1982, when an erroneous ground command accidentally overwrote battery charging routines and severed antenna communication.',
        'عملت بتفانٍ حتى 11 نوفمبر 1982 عندما تسبب أمر أرضي خاطئ في إعادة كتابة بروتوكول شحن البطارية وقطع الاتصال اللاسلكي.'
      ),
    },
    quiz: {
      prompt: L('What historic milestone did the Viking 1 Lander achieve on July 20, 1976?', 'ما هو الإنجاز التاريخي الذي حققته مركبة فايكنغ 1 في 20 يوليو 1976؟'),
      options: [
        L('Humanity’s first successful soft landing and multi-year operational science mission on Mars.', 'أول هبوط سلس ناجح ومهمة علمية تشغيلية متعددة السنوات للبشرية على المريخ.'),
        L('The return of Martian soil canisters back to Earth via rocket.', 'إعادة عينات من تربة المريخ إلى الأرض عبر صاروخ.'),
        L('The first human crew landing on the Martian surface.', 'أول هبوط لطاقم بشري على سطح المريخ.'),
      ],
      correctIndex: 0,
      explanation: L(
        'Viking 1 was the first spacecraft to touch down safely on Mars, operate for years, and transmit clear color pictures of the alien desert landscape back to Earth.',
        'كانت فايكنغ 1 أول مركبة فضائية تهبط بأمان على المريخ، وتعمل لسنوات، وترسل صوراً ملونة واضحة لمشهد الصحراء المريخية إلى الأرض.'
      ),
    },
    visitDecision: {
      prompt: L('DO WE APPROACH THE INSTRUMENT?', 'هل نقترب من المركبة؟'),
      approachOutcome: L(
        'Approaching closely risks mechanical contact with fragile weather booms and solar-oxidized metals.',
        'الاقتراب الشديد يهدد بالاحتكاك بأذرع الأرصاد الجوية الهشة والمعادن المؤكسدة.'
      ),
      keepDistanceOutcome: L(
        'Maintaining a respectful perimeter preserves the historic Viking 1 station as humanity’s pioneer monument on Mars.',
        'الحفاظ على محيط احترام يحفظ محطة فايكنغ 1 التاريخية كنصب تذكاري ريادي للبشرية على المريخ.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-viking1']],
  },

  // --- Task 5: 2D Archive Equipment Cards (`noModel: true`) ---
  'apollo-alsep': {
    id: 'apollo-alsep',
    noModel: true,
    name: L('Apollo ALSEP Stations'),
    operator: L('NASA (Apollo Surface Experiments)'),
    location: 'moon',
    launch: UNVERIFIED_TEXT, // TODO: verify Apollo 12–17 station deployment dates
    landing: L('Multiple Apollo landing sites (exact dates pending audit)'),
    status: 'halted',
    statusNote: L('Halted surface science stations; exact station-by-station shutdown dates unconfirmed in reviewed sources.'),
    lastVerified: '2026-04-15',
    story: {
      question: L('How do moonquakes, solar wind, and heat flow behave on the Moon long after astronauts depart?'),
      device: L('Central telemetry stations linked to geophysical sensors deployed near Apollo landing zones.'),
      experiment: L('Radioed seismic, magnetic, and charged-particle readings continuously back to Earth receivers.'),
      discovery: L('Recorded multi-year seismic and environmental datasets revealing clues about the Moon’s internal structure.'),
      ending: L('Transmissions were ended after years of operations, leaving the silent instrument packages intact on the regolith.'),
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-heritage-2011']],
  },

  'lunar-retroreflectors': {
    id: 'lunar-retroreflectors',
    noModel: true,
    name: L('Lunar Laser Retroreflector Arrays'),
    operator: L('Apollo & Soviet Lunokhod Programs'),
    location: 'moon',
    launch: UNVERIFIED_TEXT, // TODO: verify Apollo 11/14/15 and Lunokhod 1/2 mirror dates
    landing: UNVERIFIED_TEXT,
    status: 'passive-useful',
    statusNote: L('Passive & still useful: unpowered corner-cube optics still bounce Earth lasers for millimeter-scale distance ranging.'),
    lastVerified: '2026-04-15',
    story: {
      question: L('How precisely does the Earth-Moon distance change over decades, and does gravity behave as predicted?'),
      device: L('Arrays of fused-silica corner-cube mirrors that require zero electrical power or moving parts.'),
      experiment: L('Earth observatories fire laser pulses at the Moon and time photons reflected straight back to their source.'),
      discovery: L('Continues to enable ultra-precise Earth-Moon ranging and tests of lunar interior dynamics and gravity.'),
      ending: L('Though no electronics operate inside them, these mission relics remain scientifically active whenever lasers target them.'),
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-heritage-2011']],
  },

  'mars-pathfinder-sojourner': {
    id: 'mars-pathfinder-sojourner',
    noModel: true,
    name: L('Mars Pathfinder & Sojourner'),
    operator: L('NASA / JPL'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO: verify exact Pathfinder launch/landing dates
    landing: UNVERIFIED_TEXT,
    status: 'halted',
    statusNote: L('Halted pioneer lander & first wheeled rover on Mars; exact contact dates unconfirmed in reviewed sources.'),
    lastVerified: '2026-11-12',
    story: {
      question: L('Could a compact solar-powered rover navigate boulders and measure Martian rock chemistry safely?'),
      device: L('Airbag-cushioned lander paired with the shoebox-sized six-wheeled Sojourner rover.'),
      experiment: L('Tested autonomous hazard avoidance and pressed an X-ray spectrometer against nearby rocks.'),
      discovery: L('Demonstrated mobile surface exploration on Mars, paving the engineering path for Spirit, Opportunity, and later rovers.'),
      ending: L('Halted on the surface after communications ended; remains one of the earliest Martian surface mission relics.'),
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'mars-spirit': {
    id: 'mars-spirit',
    noModel: true,
    name: L('Spirit (MER-A)'),
    operator: L('NASA / JPL'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO: verify Spirit launch/landing/end dates
    landing: UNVERIFIED_TEXT,
    status: 'halted',
    statusNote: L('Halted twin rover to Opportunity; exact odometry & final signal date unconfirmed in reviewed sources.'),
    lastVerified: '2026-11-12',
    story: {
      question: L('Did ancient Gusev Crater hold watery minerals sculpted by volcanic hydrothermal activity or shallow water?'),
      device: L('Twin solar-powered Mars Exploration Rover carrying matching cameras and rock-grinding instruments.'),
      experiment: L('Examined bright silica-rich soils and layered rocks in the Columbia Hills after crossing crater plains.'),
      discovery: L('Found minerals formed in ancient wet and steam-altered environments — evidence of past habitability, not life.'),
      ending: L('Became embedded in soft Martian sand and lost solar charging during Martian winter, becoming a silent stationary station.'),
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'mars-phoenix': {
    id: 'mars-phoenix',
    noModel: true,
    name: L('Phoenix Mars Lander'),
    operator: L('NASA / University of Arizona'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO: verify Phoenix dates & metrics
    landing: UNVERIFIED_TEXT,
    status: 'halted',
    statusNote: L('Halted polar lander; exact sol duration and winter loss dates unconfirmed in reviewed sources.'),
    lastVerified: '2026-11-12',
    story: {
      question: L('Was frozen water lying just beneath the soil at Mars’s far northern plains?'),
      device: L('Stationary polar lander fitted with a robotic digging arm and miniature thermal chemistry ovens.'),
      experiment: L('Scooped shallow trenches into high-latitude soil to expose subsurface layers and heat samples.'),
      discovery: L('Confirmed shallow subsurface water ice near the surface in the Martian northern plains.'),
      ending: L('Designed for sunlit polar summer only, Phoenix shut down as Arctic winter darkness and carbon-dioxide frost arrived.'),
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'mars-insight': {
    id: 'mars-insight',
    noModel: true,
    name: L('InSight Lander'),
    operator: L('NASA / JPL / CNES / DLR'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO: verify InSight exact launch/landing/retirement dates
    landing: UNVERIFIED_TEXT,
    status: 'halted',
    statusNote: L('Halted geophysical station; exact quake counts & retirement date unconfirmed in reviewed sources.'),
    lastVerified: '2026-11-12',
    story: {
      question: L('What do crust thickness, mantle depth, and core size reveal about Mars’s deep interior?'),
      device: L('Stationary lander placing a domed ultra-sensitive seismometer directly onto the Martian soil.'),
      experiment: L('Listened patiently for marsquakes and meteoroid impacts rippling through the planet’s interior.'),
      discovery: L('Measured seismic waves that mapped the thickness of Mars’s crust and constrained its liquid core properties.'),
      ending: L('Accumulating dust choked solar power after years of operation, halting the station while leaving its instruments in place.'),
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'deep-space-timeline': {
    id: 'deep-space-timeline',
    noModel: true,
    isContrastTimeline: true,
    name: L('Deep Space Contrast: Silent vs. Still Active'),
    operator: L('NASA / JPL / Applied Physics Laboratory'),
    location: 'deep-space',
    launch: L('Multiple deep-space eras (Pioneer 10 halted; Voyager & New Horizons checked 2026)'),
    landing: L('Interstellar & Outer Solar System trajectories (no planetary landing)'),
    status: 'active',
    statusNote: L(
      'Contrast Card — Pioneer 10 is silent (halted), while Voyager 1 & 2 (Apr 2026) and New Horizons (Jul 2026) remain active.'
    ),
    lastVerified: '2026-07-15',
    story: {
      question: L('Do all distant spacecraft go silent forever once they leave the inner solar system?'),
      device: L('Radioisotope-powered deep-space probes using long-range high-gain dishes instead of solar panels.'),
      experiment: L('Compare Pioneer 10 (now silent/halted) against Voyager 1 & 2 (still returning interstellar readings in Apr 2026) and New Horizons (active in Jul 2026).'),
      discovery: L('Not every distant machine is silent: power reserves and receiver upgrades keep several deep-space spacecraft actively sending science.'),
      ending: L('Whether active or halted, distant and surface spacecraft are historic mission equipment — never "scrap" or "orbital debris".'),
    },
    timelineNodes: [
      {
        id: 'pioneer-10',
        name: L('Pioneer 10'),
        status: 'halted',
        note: L('Silent / halted deep-space pioneer; exact final signal year pending audit.'),
        checked: '2026-04-15',
      },
      {
        id: 'voyager-1-2',
        name: L('Voyager 1 & Voyager 2'),
        status: 'active',
        note: L('Active as of April 2026 — continuing interstellar particle and magnetic measurements.'),
        checked: '2026-04-15',
      },
      {
        id: 'new-horizons',
        name: L('New Horizons'),
        status: 'active',
        note: L('Active as of July 2026 — operating in the distant Kuiper Belt environment.'),
        checked: '2026-07-15',
      },
    ],
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-voyager'], SOURCE_BY_ID['nasa-new-horizons']],
  },

  'apollo-lunar-module': {
    id: 'apollo-lunar-module',
    name: L('Apollo Lunar Module (Descent Stage)', 'وحدة أبولو القمرية (مرحلة الهبوط)'),
    operator: L('NASA (Apollo Program)', 'وكالة ناسا (برنامج أبولو)'),
    location: 'moon',
    launch: L('Apollo 11–17 (1969–1972)', 'أبولو 11–17 (1969–1972)'),
    landing: L('Six lunar landing sites (Apollo 11, 12, 14, 15, 16, 17)', 'ستة مواقع هبوط على القمر (أبولو 11، 12، 14، 15، 16، 17)'),
    status: 'halted',
    statusNote: L(
      'Halted mission hardware: descent stages remained at the six Apollo landing sites and served as launch platforms for the ascent stage. Only the descent stage remained on the Moon.',
      'عتاد مهمة متوقف: بقيت مراحل الهبوط في مواقع هبوط أبولو الستة وعملت كمنصات إطلاق لمرحلة الصعود. مرحلة الهبوط فقط هي التي بقيت على القمر.'
    ),
    lastVerified: '2026-11-13',
    story: {
      question: L(
        'How could a crewed spacecraft land softly on an airless lunar surface and later launch astronauts back into lunar orbit?',
        'كيف يمكن لمركبة فضاء مأهولة الهبوط بنعومة على سطح القمر عديم الهواء ثم إطلاق الرواد لاحقاً للعودة إلى المدار القمري؟'
      ),
      device: L(
        'A two-stage vehicle comprising a descent stage with a throttleable rocket engine and landing gear, and an ascent stage for crew cabin and liftoff. Note that only the descent stage remained on the Moon.',
        'مركبة من مرحلتين تضم مرحلة هبوط بمحرك صاروخي قابل للتحكم وقوائم هبوط، ومرحلة صعود لكابينة الطاقم والإقلاع. مرحلة الهبوط فقط هي التي استقرت على القمر.'
      ),
      experiment: L(
        'Supported surface EVAs, scientific deployment, and geological sampling at six distinct landing zones across the lunar nearside.',
        'دعمت أنشطة السير على سطح القمر، ونشر التجارب العلمية، وجمع العينات الجيولوجية في ست مناطق هبوط مميزة على الجانب القريب للقمر.'
      ),
      discovery: L(
        'Enabled the first direct human field exploration of another world, returning over 380 kilograms of lunar samples.',
        'مكّنت أول استكشاف ميداني بشري مباشر لعالم آخر، وجلبت أكثر من 380 كيلوغراماً من الصخور والتربة القمرية.'
      ),
      ending: L(
        'Descent stages remained at the six Apollo landing sites as permanent historic mission relics, while ascent stages returned crew to orbit.',
        'بقيت مراحل الهبوط في مواقع أبولو الستة كآثار تاريخية دائمة للمهمات، بينما أعادت مراحل الصعود أطقم الرواد إلى المدار.'
      ),
    },
    quiz: {
      prompt: L(
        'Which part of the Apollo Lunar Module remained permanently on the lunar surface?',
        'أي جزء من وحدة أبولو القمرية بقي مستقراً بشكل دائم على سطح القمر؟'
      ),
      options: [
        L(
          'Only the descent stage remained on the Moon, serving as the launch platform for the crew.',
          'مرحلة الهبوط فقط هي التي بقيت على القمر، وعملت كمنصة إقلاع لطاقم الرواد.'
        ),
        L(
          'The entire spacecraft including the crew cabin stayed parked together.',
          'المركبة بأكملها بما فيها كابينة الطاقم بقيت متوقفة معاً.'
        ),
        L(
          'Both stages returned to Earth inside the Command Module.',
          'عادت كلتا المرحلتين إلى الأرض داخل وحدة القيادة.'
        ),
      ],
      correctIndex: 0,
      explanation: L(
        'Only the descent stage remained on the Moon at each Apollo site; the ascent stage carried the astronauts back into lunar orbit.',
        'مرحلة الهبوط فقط هي التي استقرت على القمر في كل موقع من مواقع أبولو؛ بينما حملت مرحلة الصعود الرواد للعودة إلى المدار القمري.'
      ),
    },
    visitDecision: {
      prompt: L('DO WE APPROACH THE INSTRUMENT?', 'هل نقترب من هذه الآلة التاريخية؟'),
      approachOutcome: L(
        'Approaching closely risks kicking abrasive regolith onto historic thermal foils and descent engine structures. NASA’s 2011 preservation recommendations advise generous buffer perimeters around landing sites.',
        'الاقتراب الشديد يهدد بإثارة الغبار القمري الكاشط على الرقائق الحرارية التاريخية وهياكل محرك الهبوط. توصي إرشادات ناسا لعام 2011 بمسافات عازلة واسعة حول مواقع الهبوط.'
      ),
      keepDistanceOutcome: L(
        'Respecting a standoff preserves historic descent stages and untouched footprint trails for future scientific study.',
        'احترام مسافة التوقف يحمي مراحل الهبوط التاريخية وآثار خطوات الرواد البكر لدراسات علمية مستقبلية.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-apollo-lm'], SOURCE_BY_ID['nasa-heritage-2011']],
  },

  'insight-lander': {
    id: 'insight-lander',
    name: L('InSight Mars Lander', 'مركبة الهبوط إنسايت على المريخ'),
    operator: L('NASA / JPL', 'وكالة ناسا / مختبر الدفع النفاث'),
    location: 'mars',
    launch: L('May 5, 2018', '5 مايو 2018'),
    landing: L('26 Nov 2018 (Elysium Planitia, Mars)', '26 نوفمبر 2018 (إليسيوم بلانيتيا، المريخ)'),
    status: 'halted',
    statusNote: L(
      'Halted spacecraft: landed 26 Nov 2018 on Mars, used a seismometer plus heat and geodesy instruments, dust on the solar panels reduced power, NASA declared it retired 21 Dec 2022 (last contact 15 Dec 2022).',
      'مركبة متوقفة: هبطت في 26 نوفمبر 2018، واستخدمت مقياس الزلازل وأجهزة التدفق الحراري والجيوديسيا؛ حجب الغبار ألواحها الشمسية مما قلص طاقتها، وأعلنت ناسا تقاعدها في 21 ديسمبر 2022 بعد آخر اتصال في 15 ديسمبر 2022.'
    ),
    lastVerified: '2026-11-13',
    story: {
      question: L(
        'What do seismic tremors, heat flow, and precision wobble reveal about the deep interior structure and core of Mars?',
        'ما الذي تكشفه الهزات الزلزالية والتدفق الحراري والتذبذب الدقيق عن البنية الداخلية العميقة ونواة كوكب المريخ؟'
      ),
      device: L(
        'A stationary lander equipped with the SEIS seismometer, HP3 heat flow probe, and RISE radio science antennas. Displayed in arm-deployed configuration before ground instrument placement.',
        'مركبة هبوط ثابتة مجهزة بمقياس الزلازل SEIS، ومسبار التدفق الحراري HP3، وهوائيات العلوم الراديوية RISE.'
      ),
      experiment: L(
        'Recorded over 1,300 marsquakes and measured subtle radio Doppler shifts to map the Martian crust, mantle, and molten core.',
        'سجلت أكثر من 1300 هزة زلزالية مريخية وقاست انزياحات دوبلر الراديوية الدقيقة لرسم خريطة قشرة المريخ ووشاحه ونواته السائلة.'
      ),
      discovery: L(
        'Revealed Mars has a liquid metallic core, determined crustal thickness, and proved the planet remains seismically active.',
        'كشفت أن للمريخ نواة معدنية سائلة، وحددت سمك قشرته، وأثبتت أن الكوكب لا يزال نشطاً زلزالياً.'
      ),
      ending: L(
        'Dust on the solar panels reduced power over four years of operations; NASA declared it retired 21 Dec 2022 after last contact on 15 Dec 2022.',
        'أدى تراكم الغبار على الألواح الشمسية إلى انخفاض الطاقة على مدار أربع سنوات من العمليات؛ وأعلنت ناسا تقاعدها في 21 ديسمبر 2022.'
      ),
    },
    quiz: {
      prompt: L(
        'What primary factor caused the InSight lander to eventually lose electrical power on Mars?',
        'ما هو العامل الأساسي الذي أدى في النهاية إلى فقدان مركبة إنسايت للطاقة الكهربائية على المريخ؟'
      ),
      options: [
        L(
          'Dust accumulating on its solar arrays gradually choked electrical generation over years.',
          'تراكم الغبار على مصفوفات الألواح الشمسية خنق توليد الكهرباء تدريجياً على مدار سنوات.'
        ),
        L(
          'A catastrophic software crash during a routine seismic recording.',
          'انهيار برمجي كارثي أثناء تسجيل زلزالي روتيني.'
        ),
        L(
          'Immediate battery failure upon landing in 2018.',
          'عطل فوري في البطاريات عند الهبوط عام 2018.'
        ),
      ],
      correctIndex: 0,
      explanation: L(
        'Without cleaning winds, atmospheric dust slowly covered InSight’s solar panels until battery power could no longer support transmissions.',
        'في غياب الرياح المنظفة، غطى الغبار الجوي ألواح إنسايت الشمسية ببطء حتى لم تعد طاقة البطاريات قادرة على دعم الإرسال.'
      ),
    },
    visitDecision: {
      prompt: L('DO WE APPROACH THE INSTRUMENT?', 'هل نقترب من هذه الآلة التاريخية؟'),
      approachOutcome: L(
        'Moving close to InSight’s deck could disturb dust distribution that records years of environmental deposition in Elysium Planitia.',
        'الاقتراب الشديد من منصة إنسايت قد يخل بتوزيع الغبار الذي يوثق سنوات من الترسيب البيئي في إليسيوم بلانيتيا.'
      ),
      keepDistanceOutcome: L(
        'A careful standoff protects InSight and its delicate deployment arm as a quiet monument to Martian geophysics.',
        'الحفاظ على مسافة آمنة يحمي مركبة إنسايت وذراع نشر أجهزتها الحساسة كصرح هادئ لفيزياء المريخ.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-insight']],
  },

  'lro-orbiter': {
    id: 'lro-orbiter',
    name: L('Lunar Reconnaissance Orbiter (LRO)', 'مسبار استكشاف القمر المداري (LRO)'),
    operator: L('NASA / Goddard Space Flight Center', 'وكالة ناسا / مركز غودارد لرحلات الفضاء'),
    location: 'moon',
    launch: L('June 18, 2009', '18 يونيو 2009'),
    landing: L('Lunar Polar Orbit (No surface landing)', 'مدار قطبي قمري (لا يوجد هبوط على السطح)'),
    status: 'active',
    statusNote: L(
      'Orbiter in lunar polar orbit. Orbit visuals are illustrative and not to true scale or true orbital geometry.',
      'مسبار مداري في مدار قطبي قمري. الرسوم التوضيحية للمدار تعبيرية وليست بمقياس رسم هندسي مطلق.'
    ),
    lastVerified: '2026-11-13',
    story: {
      question: L(
        'Can high-resolution orbital cameras map lunar topography and detect surface changes across decades?',
        'هل يمكن لكاميرات مدارية فائقة الدقة رسم تضاريس القمر بدقة ورصد التغيرات السطحية عبر العقود؟'
      ),
      device: L(
        'A lunar polar orbiter carrying a suite of cameras, altimeters, and spectrometers. Orbit visuals are illustrative and not to true scale or true orbital geometry.',
        'مسبار قطبي قمري يحمل مجموعة من الكاميرات ومقاييس الارتفاع والمطياف. الرسوم المدارية توضيحية لتبسيط الفهم.'
      ),
      experiment: L(
        'LRO\'s cameras (LROC) imaged the Apollo landing sites, showing descent stages and some tracks across the regolith.',
        'التقطت كاميرات LROC صوراً لمواقع هبوط مهمات أبولو، مظهرة مراحل الهبوط وآثار التنقل عبر التربة القمرية.'
      ),
      discovery: L(
        'Produced comprehensive 3D lunar surface maps and verified the preservation of historic hardware and tracks from orbit.',
        'أنتج خرائط ثلاثية الأبعاد شاملة لسطح القمر وأكد سلامة وبقاء العتاد التاريخي والمسارات من المدار.'
      ),
      ending: L(
        'Continues in active lunar orbit monitoring impact cratering and supporting landing site planning.',
        'يواصل عمله في مدار قمري نشط لرصد فوهات الاصطدام الجديدة ودعم التخطيط لمواقع الهبوط المستقبلية.'
      ),
    },
    quiz: {
      prompt: L(
        'What significant historic feature did LRO’s narrow-angle cameras image on the Moon?',
        'ما هي المعالم التاريخية البارزة التي صورتها كاميرات LRO ضيقة الزاوية على سطح القمر؟'
      ),
      options: [
        L(
          'Apollo landing sites, showing the preserved descent stages and astronaut tracks.',
          'مواقع هبوط رحلات أبولو، مظهرة مراحل الهبوط المحفوظة وآثار أقدام الرواد.'
        ),
        L(
          'Remnants of active ancient cities beneath the craters.',
          'بقايا مدن أثرية نشطة تحت أعماق الفوهات.'
        ),
        L(
          'Active volcanic eruptions across the lunar maria.',
          'ثورات بركانية نشطة عبر بحار القمر البازلتية.'
        ),
      ],
      correctIndex: 0,
      explanation: L(
        'LRO’s high-resolution LROC camera successfully captured clear orbital views of the Apollo descent stages, rover trails, and scientific equipment.',
        'نجحت كاميرا LROC فائقة الدقة في التقاط مشاهد مدارية واضحة لمراحل هبوط أبولو ومسارات العربات والمعدات العلمية.'
      ),
    },
    visitDecision: {
      prompt: L('ORBITAL TELEMETRY OBSERVATION', 'مراقبة القياس المداري عن بُعد'),
      approachOutcome: L(
        'Orbit visuals are illustrative and not to true scale or true orbital geometry. Telemetry is tracked via NASA ground networks.',
        'الرسوم المدارية توضيحية لتبسيط الفهم وليست بمقياس هندسي دقيق. يتم تتبع القياس عبر شبكات ناسا الأرضية.'
      ),
      keepDistanceOutcome: L(
        'Observing from designated flight geometry honors orbital mechanics and technical drawing conventions.',
        'المراقبة من زوايا الطيران المقررة تحترم قوانين الميكانيكا المدارية ومعايير التوثيق الفني.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-lro']],
  },

  'ladee-orbiter': {
    id: 'ladee-orbiter',
    name: L('Lunar Atmosphere and Dust Environment Explorer (LADEE)', 'مستكشف بيئة الغلاف الجوي والغبار القمري (لادي)'),
    operator: L('NASA / Ames Research Center', 'ناسا / مركز أميس للأبحاث'),
    location: 'moon',
    launch: L('September 7, 2013 (03:27 UTC)', '7 سبتمبر 2013 (03:27 ت.ع.م)'),
    landing: L('Lunar Far-Side Impact: April 18, 2014', 'اصطدام الجانب البعيد للقمر: 18 أبريل 2014'),
    status: 'halted',
    statusNote: L(
      'Concluded mission with intentional far-side lunar impact on 18 Apr 2014 after completing all science objectives.',
      'أنهت مهمتها باصطدام مدروس في الجانب البعيد للقمر في 18 أبريل 2014 بعد إنجاز كافة أهدافها العلمية.'
    ),
    lastVerified: '2026-11-14',
    story: {
      question: L(
        'How do solar radiation and micrometeoroids loft microscopic lunar dust above the surface into a glowing exosphere?',
        'كيف ترفع الإشعاعات الشمسية والنيازك الدقيقة ذرات الغبار القمري فوق السطح لتشكل غلافاً جوياً متوهجاً؟'
      ),
      device: L(
        'A modular carbon-composite orbiter equipped with an ultraviolet spectrometer, neutral mass spectrometer, dust detector, and an experimental optical laser communications terminal (LLCD).',
        'مسبار قمري تركيبي مزود بمطياف فوق بنفسجي، مطياف كتلة، كاشف غبار، ومحطة اتصالات ليزرية بصرية تجريبية (LLCD).'
      ),
      experiment: L(
        'Flew ultra-low science orbits (12–50 km altitude) through sunrise and sunset to directly sample levitated dust grains and exospheric gas ions.',
        'حلّق في مدارات علمية منخفضة للغاية (12–50 كم) عبر شروق الشمس وغروبها لأخذ عينات مباشرة من ذرات الغبار المرتفعة وغازات الغلاف الخارجي.'
      ),
      discovery: L(
        'Confirmed that meteoroid streams continuously generate a dust cloud surrounding the Moon, and demonstrated record-breaking 622 Mbps laser comms back to Earth.',
        'أثبت أن تدفقات النيازك تُولد باستمرار سحابة غبارية غير منتظمة تحيط بالقمر، وحطم أرقام الاتصالات الفضائية بنقل البيانات بسرعة 622 ميغابت/ثانية عبر الليزر إلى الأرض.'
      ),
      ending: L(
        'After exhausting maneuvering propellants, flight controllers commanded a planned final impact into the far-side rim of Sundman V crater on April 18, 2014, safely away from Apollo heritage sites.',
        'بعد نفاد وقود المناورة، وجّه مهندسو الرحلة المسبار للاصطدام المخطط بحافة فوهة سوندمان V في الجانب البعيد للقمر في 18 أبريل 2014 بعيداً تماماً عن مواقع أبولو التاريخية.'
      ),
    },
    quiz: {
      prompt: L('What primary scientific mystery did the LADEE orbiter investigate around the Moon?', 'ما هو اللغز العلمي الأساسي الذي حقق فيه مسبار لادي (LADEE) حول القمر؟'),
      options: [
        L('The composition of the tenuous lunar exosphere and electrostatically levitated dust.', 'تركيب الغلاف الجوي القمري الرقيق والغبار المعلق كهروستاتيكياً.'),
        L('Active magma chambers deep beneath lunar maria.', 'غرف صهارة بركانية نشطة في أعماق البحار القمرية.'),
        L('Finding liquid oceans concealed below polar craters.', 'البحث عن محيطات سائلة مخفية تحت الفوهات القطبية.'),
      ],
      correctIndex: 0,
      explanation: L(
        'LADEE analyzed the extremely thin lunar exosphere (helium, argon, neon) and confirmed that meteoroid impacts continuously loft dust grains above the lunar horizon.',
        'حلل لادي الغلاف الجوي القمري الرقيق للغاية (هيليوم، أرغون، نيون) وأثبت أن اصطدامات النيازك ترفع باستمرار جزيئات الغبار فوق الأفق القمري.'
      ),
    },
    visitDecision: {
      prompt: L('ORBITAL TELEMETRY OBSERVATION', 'مراقبة القياسات المدارية عن بُعد'),
      approachOutcome: L(
        'Approaching orbiters closely is simulated from telemetry. Real-world orbiters travel at ~1.6 km/s in low lunar orbit.',
        'الاقتراب من المسابير المدارية يتم عبر المحاكاة والقياسات اللاسلكية. تسير المسابير الحقيقية بسرعة 1.6 كم/ثانية.'
      ),
      keepDistanceOutcome: L(
        'Observing from orbital perspective showcases the spacecraft against the lunar curved horizon.',
        'المراقبة من المنظور المداري توثق المركبة الفضائية أمام انحناء الأفق القمري البديع.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-lro']],
  },

  'mgs-orbiter': {
    id: 'mgs-orbiter',
    name: L('Mars Global Surveyor (MGS)', 'مساح المريخ العالمي (MGS)'),
    operator: L('NASA / Jet Propulsion Laboratory', 'ناسا / مختبر الدفع النفاث'),
    location: 'mars',
    launch: L('November 7, 1996', '7 نوفمبر 1996'),
    landing: L('Mars Orbit Insertion: September 12, 1997', 'دخول مدار المريخ: 12 سبتمبر 1997'),
    status: 'halted',
    statusNote: L(
      'Operated in Mars orbit for nearly a decade; lost contact on November 2, 2006 following a software update error.',
      'عمل في مدار المريخ لما يقرب من عقد من الزمان؛ فُقد الاتصال في 2 نوفمبر 2006 إثر خلل في تحديث برمجي.'
    ),
    lastVerified: '2026-11-14',
    story: {
      question: L(
        'Can high-resolution orbital imaging, laser altimetry, and thermal spectroscopy reveal Mars’s geological evolution and ancient water reservoirs?',
        'هل يمكن للتصوير المداري عالي الدقة ومطياف الانبعاث الحراري كشف التطور الجيولوجي وخزانات المياه القديمة على المريخ؟'
      ),
      device: L(
        'A solar-powered orbiter equipped with the Mars Orbiter Camera (MOC), Thermal Emission Spectrometer (TES), and Mars Orbiter Laser Altimeter (MOLA).',
        'مسبار مداري يعمل بالطاقة الشمسية مزود بكاميرا المريخ المدارية (MOC)، مطياف الانبعاث الحراري (TES)، ومقياس الارتفاع الليزري (MOLA).'
      ),
      experiment: L(
        'Circled Mars from pole to pole over 37,000 times between 1999 and 2006, returning over 240,000 detailed surface images and creating the first comprehensive global 3D topographical map.',
        'دار حول المريخ أكثر من 37,000 مرة بين 1999 و2006، مرسلاً أكثر من 240,000 صورة مفصلة للسطح وبانياً أول خريطة طوبوغرافية ثلاثية الأبعاد للكوكب.'
      ),
      discovery: L(
        'Discovered apparent water-carved gullies, mineral hematite deposits indicating long-lived standing water (which chose Opportunity’s landing site), and mapped planetary crustal magnetism.',
        'اكتشف قنوات مائية حديثة التكوين، ورواسب معدن الهيماتيت الدالة على مياه راكدة سابقة (مما حدد موقع هبوط أبورتيونيتي)، ورسم خريطة المغناطيسية القشرية.'
      ),
      ending: L(
        'After operating 4 times past its planned primary mission, an erroneous software command update in November 2006 tilted a solar array away from the Sun, draining the battery.',
        'بعد عمله 4 أضعاف عمره الافتراضي، أدى خطأ في تحديث برمجي في نوفمبر 2006 إلى ميلان اللوح الشمسي بعيداً عن الشمس واستنزاف البطارية.'
      ),
    },
    quiz: {
      prompt: L('What major geological discovery by Mars Global Surveyor directly guided NASA to choose Opportunity’s landing site?', 'ما الاكتشاف الجيولوجي الهام لمساح المريخ العالمي الذي قاد ناسا لاختيار موقع هبوط أبورتيونيتي؟'),
      options: [
        L('Widespread gray hematite deposits formed in the presence of liquid water.', 'رواسب واسعة من الهيماتيت الرمادي المتشكل بوجود المياه السائلة.'),
        L('An active volcanic crater erupting sulfur.', 'فوهة بركانية نشطة تقذف الكبريت.'),
        L('Subsurface ice caves containing liquid lakes.', 'كهوف جليدية تحت سطحية تضم بحيرات سائلة.'),
      ],
      correctIndex: 0,
      explanation: L(
        'MGS’s thermal spectrometer identified an enormous gray hematite signature at Meridiani Planum, providing the definitive target for Opportunity’s water-seeking landing.',
        'حدد مطياف MGS بصمة ضخمة لمعدن الهيماتيت الرمادي في سهل ميريدياني، موفراً الهدف الحاسم لموقع هبوط مركبة أبورتيونيتي.'
      ),
    },
    visitDecision: {
      prompt: L('ORBITAL VANTAGE POINT', 'نقطة المراقبة المدارية'),
      approachOutcome: L(
        'Observing MGS in orbit reveals its distinctive parabolic high-gain dish and dual solar array wings with aerobraking drag flaps.',
        'مراقبة MGS في مداره تبرز طبق الاتصالات العالي وشبكة الألواح الشمسية المزودة بزعانف الكبح الهوائي.'
      ),
      keepDistanceOutcome: L(
        'Preserves MGS in orbital memory as the pioneer that mapped modern Mars for all surface explorers.',
        'يحفظ MGS في الذاكرة المدارية كرائد رسم خرائط المريخ الحديثة لكافة المستكشفين على السطح.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'odyssey-orbiter': {
    id: 'odyssey-orbiter',
    name: L('2001 Mars Odyssey', '2001 مارس أوديسي'),
    operator: L('NASA / Jet Propulsion Laboratory', 'ناسا / مختبر الدفع النفاث'),
    location: 'mars',
    launch: L('April 7, 2001', '7 أبريل 2001'),
    landing: L('Mars Orbit Insertion: October 24, 2001', 'دخول مدار المريخ: 24 أكتوبر 2001'),
    status: 'active',
    statusNote: L(
      'Currently active in Mars orbit — the longest continuously operating spacecraft at another planet in human history.',
      'نشطة حالياً في مدار المريخ — أطول مركبة فضائية عاملة بشكل متواصل حول كوكب آخر في تاريخ البشرية.'
    ),
    lastVerified: '2026-11-14',
    story: {
      question: L(
        'Where is water ice hidden in the shallow Martian soil, and what minerals and radiation environments will future explorers encounter?',
        'أين يختبئ جليد الماء في التربة المريخية الضحلة، وما هي المعادن ومستويات الإشعاع التي ستواجه المستكشفين؟'
      ),
      device: L(
        'A veteran science and communications orbiter equipped with the Thermal Emission Imaging System (THEMIS), Gamma Ray Spectrometer (GRS), and Martian Radiation Environment Experiment (MARIE).',
        'مسبار علمي واتصالات مخضرم مزود بنظام التصوير بالانبعاث الحراري (THEMIS)، مطياف أشعة غاما (GRS)، وتجربة البيئة الإشعاعية (MARIE).'
      ),
      experiment: L(
        'Scanned the upper meter of Martian soil worldwide for cosmic-ray neutron signatures while acting as the primary high-reliability data relay for Spirit, Opportunity, Phoenix, and Curiosity.',
        'مسح الطبقة العليا من التربة المريخية بحثاً عن بصمات النيوترونات الناتجة عن الأشعة الكونية، وعمل كجسر اتصالات رئيسي عالي الموثوقية لمركبات سبيريت، أبورتيونيتي، وفينيكس.'
      ),
      discovery: L(
        'Discovered vast underground reservoirs of shallow water ice trapped beneath the dusty surface at high latitudes, enough to fill large lakes if melted.',
        'اكتشف خزانات هائلة من جليد الماء المحتجز تحت الغبار السطحي في خطوط العرض العليا، تكفي لملء بحيرات ضخمة لو ذابت.'
      ),
      ending: L(
        'Continuing continuous active orbital science and rover communications relay around Mars after more than 23 years of continuous operation.',
        'يواصل أبحاثه العلمية النشطة وترحيل اتصالات المركبات الجوالة حول المريخ بعد أكثر من 23 عاماً من العمل المتواصل.'
      ),
    },
    quiz: {
      prompt: L('What foundational discovery made 2001 Mars Odyssey a milestone in planetary science?', 'ما هو الاكتشاف الجوهري الذي جعل مسبار 2001 مارس أوديسي علامة فارقة في علوم الكواكب؟'),
      options: [
        L('Detecting vast reserves of shallow subsurface water ice across polar and sub-polar latitudes.', 'اكتشاف احتياطيات هائلة من جليد الماء القريب من السطح في خطوط العرض القطبية.'),
        L('Finding active geothermal geysers erupting at the equator.', 'العثور على ينابيع حرارية نشطة تثور عند خط الاستواء.'),
        L('Detecting living plants growing in deep canyon shadows.', 'اكتشاف نباتات حية تنمو في ظلال الوديان العميقة.'),
      ],
      correctIndex: 0,
      explanation: L(
        'Odyssey’s Gamma Ray Spectrometer suite detected abundant hydrogen beneath the surface, confirming vast buried water ice sheets across Mars.',
        'رصد مطياف أشعة غاما وفرة في عنصر الهيدروجين تحت السطح، مؤكداً وجود طبقات جليد مائي شاسعة مدفونة عبر المريخ.'
      ),
    },
    visitDecision: {
      prompt: L('ORBITAL VANTAGE POINT', 'نقطة المراقبة المدارية'),
      approachOutcome: L(
        'Odyssey continues flying its Sun-synchronous circular science orbit around Mars, providing constant telemetry contact.',
        'تواصل أوديسي الطيران في مدارها المتزامن مع الشمس حول المريخ مقدمة اتصالاً لاسلكياً مستمراً.'
      ),
      keepDistanceOutcome: L(
        'A wider orbital view captures the sheer longevity of humanity\'s longest-serving interplanetary sentry.',
        'الرؤية المدارية الشاملة تعكس التاريخ الممتد لأطول حارس كوكبي للبشرية في الفضاء السحيق.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'mro-orbiter': {
    id: 'mro-orbiter',
    name: L('Mars Reconnaissance Orbiter (MRO)', 'مستكشف المريخ المداري (MRO)'),
    operator: L('NASA / Jet Propulsion Laboratory', 'ناسا / مختبر الدفع النفاث'),
    location: 'mars',
    launch: L('August 12, 2005', '12 أغسطس 2005'),
    landing: L('Mars Orbit Insertion: March 10, 2006', 'دخول مدار المريخ: 10 مارس 2006'),
    status: 'active',
    statusNote: L(
      'Active orbital reconnaissance laboratory and primary ultra-high-bandwidth communications relay for Mars surface rovers.',
      'مختبر استطلاع مداري نشط وحلقة وصل للاتصالات فائقة السرعة للمركبات الجوالة على سطح المريخ.'
    ),
    lastVerified: '2026-11-14',
    story: {
      question: L(
        'How can orbital cameras achieve sub-meter resolution to identify safe rover landing zones and track dynamic seasonal processes on Mars?',
        'كيف يمكن لكاميرات مدارية تحقيق دقة دون المتر لتحديد مناطق هبوط آمنة وتتبع العمليات الموسمية على المريخ؟'
      ),
      device: L(
        'A massive two-ton spacecraft carrying the High Resolution Imaging Science Experiment (HiRISE, half-meter aperture telescope), CRISM mineral spectrometer, and SHARAD shallow radar.',
        'مركبة عملاقة تزن طنين تحمل تلسكوب HiRISE بقطر نصف متر، مطياف CRISM المعدني، ورادار SHARAD السبر السطحي.'
      ),
      experiment: L(
        'Captured over 75,000 targeted images with resolution down to 25–30 centimeters per pixel, revealing rocks the size of dinner plates and resolving all Mars rovers and landers from orbit.',
        'التقط أكثر من 75,000 صورة موجهة بدقة تصل إلى 25-30 سم لكل بكسل، كاشفاً صخوراً بحجم الأطباق ومصوراً كافة روفرات ومركبات هبوط المريخ من الفضاء.'
      ),
      discovery: L(
        'Discovered seasonal Recurring Slope Lineae (dark flows on warm slopes), active polar avalanches, CO2 gas geysers, and mapped pure subterranean water-ice cliffs.',
        'اكتشف خطوط المنحدرات الموسمية المتكررة (RSL)، والانهيارات الجليدية القطبية النشطة، وفوارات غاز ثاني أكسيد الكربون، وجروف جليد الماء النقي تحت السطحي.'
      ),
      ending: L(
        'Continuing vital active mapping science and transmitting the majority of all scientific data sent back by Perseverance and Curiosity.',
        'يواصل أبحاثه الخرائطية الحيوية وينقل الغالبية العظمى من كافة البيانات العلمية التي ترسلها مركبات بيرسيفيرانس وكيريوسيتي.'
      ),
    },
    quiz: {
      prompt: L('What makes MRO’s HiRISE camera uniquely capable among planetary instruments?', 'ما الذي يجعل كاميرا HiRISE على متن MRO فريدة واستثنائية بين أدوات استكشاف الكواكب؟'),
      options: [
        L('It achieves sub-meter detail (25–30 cm/pixel), resolving individual boulders and rover wheel tracks.', 'تحقق دقة تفوق المتر (25-30 سم/بكسل)، كاشفة الصخور الفردية وآثار عجلات الروفرات.'),
        L('It uses traditional analog photographic paper returned via heat shield.', 'تستخدم ورق تصوير فوتوغرافي تقليدي يُستعاد بدرع حراري.'),
        L('It operates only during global planetary dust storms.', 'تعمل فقط أثناء العواصف الغبارية الكوكبية الشاملة.'),
      ],
      correctIndex: 0,
      explanation: L(
        'HiRISE is the most powerful optical telescope ever flown on a planetary mission, powerful enough to photograph rovers on the surface and map safe meter-scale landing hazards.',
        'كاميرا HiRISE هي أقوى تلسكوب بصري حُمل إلى كوكب آخر، قادرة على تصوير المركبات على السطح ورسم خرائط الأخطار التضاريسية بدقة متناهية.'
      ),
    },
    visitDecision: {
      prompt: L('ORBITAL VANTAGE POINT', 'نقطة المراقبة المدارية'),
      approachOutcome: L(
        'Viewing MRO in low Mars orbit highlights its huge 3-meter high-gain antenna dish and sprawling solar wings.',
        'مشاهدة MRO في مدار منخفض تبرز طبق الاتصالات الضخم بقطر 3 أمتار وأجنحته الشمسية الممتدة.'
      ),
      keepDistanceOutcome: L(
        'Provides a broad planetary perspective as MRO scans the Martian plains below.',
        'يمنح رؤية كوكبية واسعة بينما يمسح MRO السهول المريخية في الأسفل.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'maven-orbiter': {
    id: 'maven-orbiter',
    name: L('MAVEN Orbiter (Mars Atmosphere and Volatile EvolutioN)', 'مسبار مافن (MAVEN)'),
    operator: L('NASA / Goddard Space Flight Center', 'ناسا / مركز غودارد لرحلات الفضاء'),
    location: 'mars',
    launch: L('November 18, 2013', '18 نوفمبر 2013'),
    landing: L('Mars Orbit Insertion: September 22, 2014', 'دخول مدار المريخ: 22 سبتمبر 2014'),
    status: 'active',
    statusNote: L(
      'Active orbital science laboratory investigating atmospheric loss and serving as secondary rover telemetry relay.',
      'مختبر مداري نشط يبحث في فقدان الغلاف الجوي ويعمل كحلقة ترحيل ثانوية لاتصالات الروفرات.'
    ),
    lastVerified: '2026-11-14',
    story: {
      question: L(
        'What physical process stripped Mars of its ancient thick, warm atmosphere and converted it into a frigid, desiccated desert world?',
        'ما هي الآلية الفيزيائية التي جردت المريخ من غلافه الجوي الكثيف القديم وحولته إلى كوكب صحراوي قاحل وشديد البرودة؟'
      ),
      device: L(
        'An elliptical-orbit science spacecraft carrying energetic ion and magnetic field booms, solar wind sensors, and ultraviolet spectrographs.',
        'مسبار علمي في مدار بيضاوي يحمل أذرع قياس الأيونات والمجال المغناطيسي، وحساسات الرياح الشمسية، ومطياف الأشعة فوق البنفسجية.'
      ),
      experiment: L(
        'Repeatedly performed "deep dip" passes down to 125 km altitude, directly tasting the upper atmosphere to measure how fast solar storm ions knock atmospheric gas molecules into interplanetary space.',
        'نفذ مناورات غوص عميق متكررة حتى ارتفاع 125 كم، متذوقاً الغلاف الجوي العلوي مباشرة لقياس سرعة اقتلاع الرياح الشمسية للغازات نحو الفضاء الخارجي.'
      ),
      discovery: L(
        'Proved that solar wind stripping and coronal mass ejections blew away over 85% of Mars’s atmosphere after the young planet lost its protective global magnetic dynamo.',
        'أثبت أن تجريد الرياح الشمسية والانبعاثات الإكليلية طرد أكثر من 85% من غلاف المريخ الجوي بعد أن فقد الكوكب مجاله المغناطيسي الحامي.'
      ),
      ending: L(
        'Continuing active atmospheric climatology and space-weather monitoring while relaying telemetry from Mars surface missions.',
        'يواصل أبحاث المناخ الجوي ورصد طقس الفضاء مع ترحيل البيانات اللاسلكية لمركبات السطح المريخي.'
      ),
    },
    quiz: {
      prompt: L('According to MAVEN’s measurements, what was the primary driver of Mars’s dramatic atmospheric loss?', 'وفقاً لقياسات مسبار مافن، ما هو المحرك الأساسي للفقدان الهائل لغلاف المريخ الجوي؟'),
      options: [
        L('Erosion by energetic solar wind ions after Mars lost its global magnetic shield.', 'التآكل بفعل أيونات الرياح الشمسية بعد فقدان المريخ لمجاله المغناطيسي العالمي.'),
        L('Absorption of nitrogen and oxygen by subterranean lava tubes.', 'امتصاص النيتروجين والأكسجين في أنابيب الحمم البركانية التحت سطحية.'),
        L('A catastrophic impact with a giant comet in recent centuries.', 'اصطدام كارثي مع مذنب عملاق في القرون القريبة الماضية.'),
      ],
      correctIndex: 0,
      explanation: L(
        'MAVEN proved that when Mars’s internal magnetic dynamo cooled and died billions of years ago, the unshielded solar wind stripped away the atmosphere into space.',
        'أثبت مافن أنه عندما برد الدينامو المغناطيسي الداخلي للمريخ قبل مليارات السنين، قامت الرياح الشمسية غير المحجوبة بنزع الغلاف الجوي نحو الفضاء.'
      ),
    },
    visitDecision: {
      prompt: L('ORBITAL VANTAGE POINT', 'نقطة المراقبة المدارية'),
      approachOutcome: L(
        'MAVEN’s distinctive gull-wing solar panels and long articulated instrument boom are prominently visible along its elliptical orbit.',
        'تظهر ألواح مافن الشمسية المميزة وجناح أجهزة الاستشعار بوضوح في مساره البيضاوي الممتد.'
      ),
      keepDistanceOutcome: L(
        'Viewing from orbit illustrates the dipping trajectory passing between interplanetary space and the upper atmosphere.',
        'المشاهدة المدارية توضح المسار الممتد بين الفضاء السحيق والطبقات الجوية العليا.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },
};

export const ARCHIVE_EQUIPMENT_IDS = [
  'apollo-alsep',
  'lunar-retroreflectors',
  'mars-pathfinder-sojourner',
  'mars-spirit',
  'mars-phoenix',
  'mars-insight',
  'deep-space-timeline',
];

/** Concise bilingual UI chrome labels so no new HUD/Story text is hardcoded in JSX. */
export const STORY_UI_COPY = {
  en: {
    statusLabels: {
      halted: 'HALTED',
      'passive-useful': 'PASSIVE & STILL USEFUL',
      active: 'ACTIVE AS OF LAST UPDATE',
      unverified: 'UNVERIFIED',
    },
    verifiedChipPrefix: 'VERIFIED',
    learnMore: 'LEARN MORE',
    showLess: 'HIDE DETAILS',
    sectionLabels: {
      question: 'THE QUESTION',
      device: 'THE DEVICE',
      experiment: 'THE EXPERIMENT',
      discovery: 'THE DISCOVERY',
      ending: 'THE END',
      verify: 'VERIFY',
    },
    quizHeader: 'KNOWLEDGE CHECK',
    quizExplanationLabel: 'MISSION NOTE',
    visitSafeBtn: 'KEEP RESPECTFUL DISTANCE',
    visitApproachBtn: 'APPROACH CLOSELY',
    visitHint: 'NASA 2011 lunar heritage recommendations (advisory technical guidance, not binding law)',
    operatorLabel: 'OPERATOR',
    launchLabel: 'LAUNCH',
    landingLabel: 'LANDING',
    sourcesLabel: 'SOURCE RECORDS',
    viewAllSources: 'VIEW ALL SOURCES',
    moreEquipmentBtn: 'MORE EQUIPMENT',
    moreEquipmentTitle: 'OTHER REMAINING EQUIPMENT',
    moreEquipmentSubtitle:
      'Historic surface stations, passive reflectors, and active vs. silent deep-space probes',
    filters: {
      all: 'ALL REGIONS',
      moon: 'MOON',
      mars: 'MARS',
      'deep-space': 'DEEP SPACE',
    },
    deepSpaceContrastTitle: 'SILENT VS. STILL ACTIVE TIMELINE',
    sourcesModalTitle: 'SOURCES & VERIFICATION LOG',
    sourcesModalSubtitle:
      'Editorial policy: surface craft are remaining equipment or mission relics — never "junk", "scrap", or "orbital debris". Unreviewed facts are marked unverified.',
    menuSourcesBtn: 'Sources',
    closeLabel: 'CLOSE',
    openExternal: 'OPEN RECORD',
    accessedLabel: 'ACCESSED',
    locationLabels: {
      moon: 'LUNAR SECTOR',
      mars: 'MARTIAN SECTOR',
      'deep-space': 'DEEP SPACE',
    },
    logbookNotes: {
      book: "Grandpa's Logbook — Entry 01: They didn't vanish. They stayed right where their last command ended.",
      drift: "Grandpa's Margin Note — Two quiet worlds and the vast expanse of deep space hold machines built by hands from Earth.",
      choice: "Grandpa's Field Sketch — Choose a destination below, and read carefully before you disturb a single speck of dust.",
    },
  },
  ar: {
    statusLabels: {
      halted: 'متوقفة',
      'passive-useful': 'خاملة ولا تزال مفيدة',
      active: 'نشطة وفق آخر تحديث',
      unverified: 'غير موثقة',
    },
    verifiedChipPrefix: 'موثق',
    learnMore: 'المزيد من التفاصيل',
    showLess: 'إخفاء التفاصيل',
    sectionLabels: {
      question: 'السؤال العلمي',
      device: 'الآلة الفضائية',
      experiment: 'التجربة العلمية',
      discovery: 'الاكتشاف',
      ending: 'المصير النهائي',
      verify: 'التوثيق العلمي',
    },
    quizHeader: 'اختبار معلومات المهمة',
    quizExplanationLabel: 'ملاحظة علمية',
    visitSafeBtn: 'الحفاظ على مسافة احترام تراثية',
    visitApproachBtn: 'الاقتراب للمعاينة الدقيقة',
    visitHint: 'توصيات ناسا لعام 2011 لحماية التراث القمري (إرشادات فنية استشارية)',
    operatorLabel: 'المشغّل',
    launchLabel: 'تاريخ الإطلاق',
    landingLabel: 'موقع الهبوط',
    sourcesLabel: 'سجلات المصادر',
    viewAllSources: 'عرض كل المصادر',
    moreEquipmentBtn: 'معدات إضافية',
    moreEquipmentTitle: 'معدات فضائية أخرى متبقية',
    moreEquipmentSubtitle:
      'محطات سطحية تاريخية، عواكس ليزرية خاملة، ومسابير الفضاء السحيق',
    filters: {
      all: 'كل القطاعات',
      moon: 'القمر',
      mars: 'المريخ',
      'deep-space': 'الفضاء السحيق',
    },
    deepSpaceContrastTitle: 'الخط الزمني للمسابير الصامتة والنشطة',
    sourcesModalTitle: 'سجل المصادر والتوثيق العلمي',
    sourcesModalSubtitle:
      'السياسة التحريرية: مركبات السطح معدات متبقية وآثار تاريخية وليست "خردة".',
    menuSourcesBtn: 'المصادر',
    closeLabel: 'إغلاق',
    openExternal: 'فتح السجل الرسمي',
    accessedLabel: 'تاريخ المراجعة',
    locationLabels: {
      moon: 'القطاع القمري',
      mars: 'القطاع المريخي',
      'deep-space': 'الفضاء السحيق',
    },
    logbookNotes: {
      book: 'دفتر مهام جدي — التدوينة 01: لم تختفِ، بل بقيت صامدة حيث انتهت آخر أوامرها.',
      drift: 'ملاحظة هامشية لجدي — عالمان هادئان ورحاب الفضاء الشاسع يحتضنان آلات صنعتها أيدٍ بشرية.',
      choice: 'رسم تخطيطي لجدي — اختر وجهتك أدناه، واقرأ بعناية قبل أن تلمس ذرة غبار واحدة.',
    },
  },
};

function pickText(field, lang = 'en') {
  if (!field) return '';
  if (typeof field === 'string') return field;
  const candidate = field[lang];
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }
  return field.en || '';
}

function resolveStoryEntry(entry, lang) {
  if (!entry) return null;
  return {
    id: entry.id,
    noModel: Boolean(entry.noModel),
    isContrastTimeline: Boolean(entry.isContrastTimeline),
    name: pickText(entry.name, lang),
    operator: pickText(entry.operator, lang),
    location: entry.location,
    launch: pickText(entry.launch, lang),
    landing: pickText(entry.landing, lang),
    status: entry.status,
    statusNote: pickText(entry.statusNote, lang),
    lastVerified: entry.lastVerified,
    story: {
      question: pickText(entry.story?.question, lang),
      device: pickText(entry.story?.device, lang),
      experiment: pickText(entry.story?.experiment, lang),
      discovery: pickText(entry.story?.discovery, lang),
      ending: pickText(entry.story?.ending, lang),
    },
    quiz: entry.quiz
      ? {
          prompt: pickText(entry.quiz.prompt, lang),
          options: (entry.quiz.options || []).map((opt) => pickText(opt, lang)),
          correctIndex: entry.quiz.correctIndex,
          explanation: pickText(entry.quiz.explanation, lang),
        }
      : null,
    visitDecision: entry.visitDecision
      ? {
          prompt: pickText(entry.visitDecision.prompt, lang),
          approachOutcome: pickText(entry.visitDecision.approachOutcome, lang),
          keepDistanceOutcome: pickText(entry.visitDecision.keepDistanceOutcome, lang),
        }
      : null,
    timelineNodes: entry.timelineNodes
      ? entry.timelineNodes.map((node) => ({
          id: node.id,
          name: pickText(node.name, lang),
          status: node.status,
          note: pickText(node.note, lang),
          checked: node.checked,
        }))
      : null,
    sources: (entry.sources || []).map((src) => ({
      id: src.id,
      label: pickText(src.label, lang),
      url: src.url,
      accessed: src.accessed,
    })),
  };
}

/** Returns localized story data for a given craft id, falling back to English. */
export function getCraftStory(id, lang = 'en') {
  return resolveStoryEntry(CRAFT_STORIES[id], lang);
}

/** Returns localized UI chrome labels for the storytelling layer, falling back to English. */
export function getStoryUiCopy(lang = 'en') {
  const en = STORY_UI_COPY.en;
  const override = STORY_UI_COPY[lang];
  if (!override || lang === 'en') return en;
  return {
    ...en,
    ...override,
    statusLabels: { ...en.statusLabels, ...(override.statusLabels || {}) },
    sectionLabels: { ...en.sectionLabels, ...(override.sectionLabels || {}) },
    filters: { ...en.filters, ...(override.filters || {}) },
    locationLabels: { ...en.locationLabels, ...(override.locationLabels || {}) },
    logbookNotes: { ...en.logbookNotes, ...(override.logbookNotes || {}) },
  };
}

/** Returns all 2D archive equipment entries (Moon, Mars, and Deep Space contrast card). */
export function getArchiveEquipment(lang = 'en') {
  return ARCHIVE_EQUIPMENT_IDS.map((id) => getCraftStory(id, lang)).filter(Boolean);
}

/** Returns the deduplicated list of verified & audited mission sources. */
export function getAllCraftSources(lang = 'en') {
  return CRAFT_SOURCES.map((src) => ({
    id: src.id,
    label: pickText(src.label, lang),
    url: src.url,
    accessed: src.accessed,
  }));
}

/** React hook keeping components synchronized with SettingsModal language changes. */
export function useActiveLanguage() {
  const [lang, setLang] = useState(() => readStoredSettings().language || 'en');

  useEffect(() => {
    const handleSettingsChange = (e) => {
      const next = e?.detail?.language || readStoredSettings().language || 'en';
      setLang(next);
    };
    window.addEventListener('gameSettingsChange', handleSettingsChange);
    return () => window.removeEventListener('gameSettingsChange', handleSettingsChange);
  }, []);

  return lang;
}
