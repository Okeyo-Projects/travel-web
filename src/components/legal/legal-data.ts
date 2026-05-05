import type { AppLocale } from "@/lib/i18n";

export type LegalBullet = {
  text: string;
  children?: LegalBullet[];
};

export type LegalSection = {
  id: string;
  title: string;
  intro?: string;
  paragraphs?: string[];
  bullets?: LegalBullet[];
};

const LAST_UPDATED_ISO = "2026-03-13";

export function getLegalLastUpdated(locale: AppLocale): string {
  const date = new Date(LAST_UPDATED_ISO);
  switch (locale) {
    case "en":
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    case "ar":
      return date.toLocaleDateString("ar-MA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    case "fr":
    default:
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  }
}

const frTermsSections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      "Les présentes Conditions d'utilisation encadrent l'accès et l'usage de la plateforme okeyo travel pour la réservation d'hébergements, d'activités et de voyages.",
      "En créant un compte, en publiant une offre ou en effectuant une réservation, vous acceptez ces conditions en tant qu'utilisateur ou prestataire.",
    ],
  },
  {
    id: "definitions",
    title: "Définitions",
    bullets: [
      {
        text: "Utilisateur : toute personne qui consulte, réserve ou paie une offre via la plateforme.",
      },
      {
        text: "Prestataire : toute personne ou structure qui publie une offre d'hébergement, d'activité ou de voyage.",
      },
      {
        text: "Réservation : toute commande validée après confirmation du paiement ou selon le mode affiché lors du checkout.",
      },
      {
        text: "Contenu : les textes, photos, vidéos, avis, calendriers et autres éléments mis en ligne sur okeyo travel.",
      },
      {
        text: "Plateforme : le site web, l'application mobile et les services associés exploités sous la marque okeyo travel.",
      },
    ],
  },
  {
    id: "account-registration",
    title: "Inscription et Compte",
    intro:
      "L'accès à certaines fonctionnalités suppose la création d'un compte.",
    bullets: [
      {
        text: "Vous devez fournir des informations exactes, complètes et mises à jour.",
      },
      {
        text: "Vous êtes responsable de la confidentialité de vos identifiants et des actions réalisées depuis votre compte.",
      },
      {
        text: "Vous devez être légalement autorisé à publier une offre ou à effectuer une réservation.",
      },
      {
        text: "Nous pouvons suspendre ou supprimer un compte en cas de fraude, d'abus ou de violation grave des présentes conditions.",
      },
    ],
  },
  {
    id: "booking-payments",
    title: "Réservations et Paiements",
    bullets: [
      {
        text: "Les réservations sont effectuées via la plateforme selon les disponibilités, prix et conditions affichés au moment de la commande.",
      },
      {
        text: "Les utilisateurs acceptent le prix affiché, les éventuels frais de service et les conditions particulières du prestataire.",
      },
      {
        text: "Les paiements sont traités via nos partenaires de paiement sécurisés. Les informations bancaires complètes ne sont pas stockées sur nos serveurs.",
      },
      {
        text: "Le prestataire reste responsable de la bonne exécution de la prestation réservée.",
      },
    ],
  },
  {
    id: "cancellation-policy",
    title: "Annulation et Remboursement",
    bullets: [ 
      {
        text: "Chaque offre peut comporter ses propres conditions d'annulation, clairement affichées avant confirmation de la réservation.",
      },
      {
        text: "En cas d'annulation par le prestataire, l'utilisateur peut prétendre au remboursement intégral du montant payé.",
      },
      {
        text: "Les délais de remboursement dépendent également du prestataire de paiement utilisé.",
      },
      {
        text: "Les annulations abusives, répétées ou contraires aux règles de la plateforme peuvent entraîner des restrictions de compte.",
      },
    ],
  },
  {
    id: "user-conduct",
    title: "Conduite de l'Utilisateur",
    intro:
      "L'utilisateur s'engage à utiliser la plateforme de manière loyale et conforme à la loi.",
    bullets: [
      {
        text: "Sont notamment interdits :",
        children: [
          { text: "les fausses réservations ou les paiements frauduleux" },
          { text: "les commentaires insultants, diffamatoires ou mensongers" },
          {
            text: "le contournement du système de réservation, de paiement ou de commissions",
          },
          {
            text: "toute utilisation illégale, nuisible ou trompeuse de la plateforme",
          },
        ],
      },
      {
        text: "L'utilisateur doit respecter les règles du lieu, les horaires, les consignes de sécurité et les instructions du prestataire.",
      },
    ],
  },
  {
    id: "host-obligations",
    title: "Obligations du Prestataire",
    intro:
      "Le prestataire reste seul responsable du contenu de son offre et de l'exécution du service proposé.",
    bullets: [
      {
        text: "Publier des informations exactes, transparentes et à jour sur les offres, tarifs, disponibilités et restrictions.",
      },
      {
        text: "Disposer des autorisations, licences, assurances et droits nécessaires pour proposer l'offre publiée.",
      },
      {
        text: "Fournir des photos et vidéos fidèles, réelles et libres de droits.",
      },
      {
        text: "Honorer les réservations confirmées et assurer un niveau de sécurité, de propreté et de qualité conforme à la description.",
      },
      {
        text: "Collaborer avec okeyo travel en cas de litige, réclamation ou incident lié à une réservation.",
      },
    ],
  },
  {
    id: "intellectual-property",
    title: "Propriété Intellectuelle",
    bullets: [
      {
        text: "Les éléments graphiques, marques, logos, textes et interfaces de la plateforme restent la propriété d'okeyo travel ou de ses concédants.",
      },
      {
        text: "Vous conservez les droits sur les contenus que vous publiez, mais vous accordez à okeyo travel une licence nécessaire pour les héberger, afficher et promouvoir les offres sur ses supports.",
      },
      {
        text: "Il est interdit de copier, reproduire, extraire ou exploiter les contenus ou la marque sans autorisation préalable.",
      },
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation de Responsabilité",
    bullets: [
      {
        text: "okeyo travel agit comme intermédiaire entre utilisateurs et prestataires et ne remplace pas leurs obligations respectives.",
      },
      {
        text: "Nous ne pouvons être tenus responsables des retards, annulations, accidents, pertes ou dommages causés par un prestataire ou par un événement extérieur échappant à notre contrôle raisonnable.",
      },
      {
        text: "Chaque partie demeure responsable de ses déclarations, de son comportement et du respect des lois qui lui sont applicables.",
      },
    ],
  },
  {
    id: "dispute-resolution",
    title: "Litiges et Droit Applicable",
    paragraphs: [
      "En cas de différend, les parties s'engagent à rechercher d'abord une solution amiable avec l'aide du support okeyo travel.",
      "À défaut d'accord amiable, le litige pourra être soumis aux juridictions compétentes du Maroc, sous réserve des règles impératives applicables au consommateur.",
    ],
  },
  {
    id: "changes-to-terms",
    title: "Modifications des Conditions",
    paragraphs: [
      "Nous pouvons mettre à jour ces conditions pour refléter l'évolution de la plateforme, des obligations légales ou de notre modèle de service.",
      "En cas de modification importante, nous publierons une version mise à jour sur cette page et pourrons vous en informer par e-mail ou via l'application.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    bullets: [
      { text: "Support général : support@okeyo.ma" },
      { text: "Questions juridiques : legal@okeyo.ma" },
      { text: "Adresse de contact : okeyo travel, Maroc" },
    ],
  },
];

const enTermsSections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      "These Terms of Service govern access to and use of the Okeyo Travel platform for booking accommodations, activities, and trips.",
      "By creating an account, publishing an offer, or making a booking, you accept these terms as a user or provider.",
    ],
  },
  {
    id: "definitions",
    title: "Definitions",
    bullets: [
      {
        text: "User: any person who browses, books, or pays for an offer through the platform.",
      },
      {
        text: "Provider: any individual or organization that publishes an accommodation, activity, or trip offer.",
      },
      {
        text: "Booking: any order confirmed after payment confirmation or according to the mode displayed at checkout.",
      },
      {
        text: "Content: texts, photos, videos, reviews, calendars, and other elements posted on Okeyo Travel.",
      },
      {
        text: "Platform: the website, mobile application, and associated services operated under the Okeyo Travel brand.",
      },
    ],
  },
  {
    id: "account-registration",
    title: "Registration and Account",
    intro: "Access to certain features requires creating an account.",
    bullets: [
      {
        text: "You must provide accurate, complete, and up-to-date information.",
      },
      {
        text: "You are responsible for the confidentiality of your credentials and for actions taken from your account.",
      },
      {
        text: "You must be legally authorized to publish an offer or make a booking.",
      },
      {
        text: "We may suspend or delete an account in case of fraud, abuse, or serious violation of these terms.",
      },
    ],
  },
  {
    id: "booking-payments",
    title: "Bookings and Payments",
    bullets: [
      {
        text: "Bookings are made through the platform according to availability, prices, and conditions displayed at the time of order.",
      },
      {
        text: "Users accept the displayed price, any service fees, and the provider's specific conditions.",
      },
      {
        text: "Payments are processed through our secure payment partners. Full banking details are not stored on our servers.",
      },
      {
        text: "The provider remains responsible for the proper execution of the booked service.",
      },
    ],
  },
  {
    id: "cancellation-policy",
    title: "Cancellation and Refund",
    bullets: [
      {
        text: "Each offer may have its own cancellation conditions, clearly displayed before booking confirmation.",
      },
      {
        text: "In case of cancellation by the provider, the user is entitled to a full refund of the amount paid.",
      },
      {
        text: "Refund timelines also depend on the payment provider used.",
      },
      {
        text: "Abusive, repeated, or platform rule-violating cancellations may result in account restrictions.",
      },
    ],
  },
  {
    id: "user-conduct",
    title: "User Conduct",
    intro:
      "The user agrees to use the platform fairly and in compliance with the law.",
    bullets: [
      {
        text: "The following are strictly prohibited:",
        children: [
          { text: "fake bookings or fraudulent payments" },
          { text: "insulting, defamatory, or false reviews" },
          { text: "circumventing the booking, payment, or commission system" },
          { text: "any illegal, harmful, or deceptive use of the platform" },
        ],
      },
      {
        text: "The user must respect the venue's rules, schedules, safety guidelines, and the provider's instructions.",
      },
    ],
  },
  {
    id: "host-obligations",
    title: "Provider Obligations",
    intro:
      "The provider remains solely responsible for the content of their offer and the execution of the proposed service.",
    bullets: [
      {
        text: "Publish accurate, transparent, and up-to-date information about offers, prices, availability, and restrictions.",
      },
      {
        text: "Hold the necessary authorizations, licenses, insurance, and rights to propose the published offer.",
      },
      {
        text: "Provide photos and videos that are faithful, real, and free of rights.",
      },
      {
        text: "Honor confirmed bookings and ensure a level of safety, cleanliness, and quality consistent with the description.",
      },
      {
        text: "Cooperate with Okeyo Travel in the event of a dispute, claim, or incident related to a booking.",
      },
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    bullets: [
      {
        text: "The graphic elements, trademarks, logos, texts, and interfaces of the platform remain the property of Okeyo Travel or its licensors.",
      },
      {
        text: "You retain rights to the content you publish, but you grant Okeyo Travel the necessary license to host, display, and promote offers on its channels.",
      },
      {
        text: "It is prohibited to copy, reproduce, extract, or exploit the content or brand without prior authorization.",
      },
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    bullets: [
      {
        text: "Okeyo Travel acts as an intermediary between users and providers and does not replace their respective obligations.",
      },
      {
        text: "We cannot be held liable for delays, cancellations, accidents, losses, or damages caused by a provider or by an external event beyond our reasonable control.",
      },
      {
        text: "Each party remains responsible for its statements, conduct, and compliance with applicable laws.",
      },
    ],
  },
  {
    id: "dispute-resolution",
    title: "Disputes and Applicable Law",
    paragraphs: [
      "In case of a dispute, the parties agree to first seek an amicable solution with the help of Okeyo Travel support.",
      "Failing an amicable agreement, the dispute may be submitted to the competent jurisdictions of Morocco, subject to mandatory consumer protection rules.",
    ],
  },
  {
    id: "changes-to-terms",
    title: "Changes to Terms",
    paragraphs: [
      "We may update these terms to reflect changes to the platform, legal obligations, or our service model.",
      "In case of significant changes, we will publish an updated version on this page and may notify you by email or through the app.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    bullets: [
      { text: "General support: support@okeyo.ma" },
      { text: "Legal questions: legal@okeyo.ma" },
      { text: "Contact address: Okeyo Travel, Morocco" },
    ],
  },
];

const arTermsSections: LegalSection[] = [
  {
    id: "introduction",
    title: "مقدمة",
    paragraphs: [
      "تحكم شروط الاستخدام هذه الوصول إلى منصة Okeyo Travel واستخدامها لحجز الإقامات والأنشطة والرحلات.",
      "بإنشاء حساب أو نشر عرض أو إجراء حجز، فإنك تقبل هذه الشروط بصفة مستخدم أو مقدم خدمة.",
    ],
  },
  {
    id: "definitions",
    title: "التعريفات",
    bullets: [
      {
        text: "المستخدم: أي شخص يتصفح أو يحجز أو يدفع مقابل عرض عبر المنصة.",
      },
      {
        text: "مقدم الخدمة: أي شخص أو كيان ينشر عرض إقامة أو نشاط أو رحلة.",
      },
      {
        text: "الحجز: أي طلب تم تأكيده بعد تأكيد الدفع أو وفقًا للطريقة المعروضة عند إتمام الطلب.",
      },
      {
        text: "المحتوى: النصوص والصور ومقاطع الفيديو والتقييمات والتقويمات والعناصر الأخرى المنشورة على Okeyo Travel.",
      },
      {
        text: "المنصة: الموقع الإلكتروني وتطبيق الهاتف المحمول والخدمات المرتبطة المشغلة تحت علامة Okeyo Travel.",
      },
    ],
  },
  {
    id: "account-registration",
    title: "التسجيل والحساب",
    intro: "الوصول إلى بعض الميزات يتطلب إنشاء حساب.",
    bullets: [
      {
        text: "يجب عليك تقديم معلومات دقيقة وكاملة ومحدثة.",
      },
      {
        text: "أنت مسؤول عن سرية بيانات اعتمادك وعن الإجراءات المنفذة من حسابك.",
      },
      {
        text: "يجب أن تكون مخولاً قانونياً لنشر عرض أو إجراء حجز.",
      },
      {
        text: "يجوز لنا تعليق أو حذف حساب في حالة الاحتيال أو الإساءة أو الانتهاك الجدي لهذه الشروط.",
      },
    ],
  },
  {
    id: "booking-payments",
    title: "الحجوزات والمدفوعات",
    bullets: [
      {
        text: "تُجرى الحجوزات عبر المنصة وفقًا للتوافر والأسعار والشروط المعروضة وقت الطلب.",
      },
      {
        text: "يقبل المستخدمون السعر المعروض وأي رسوم خدمة والشروط الخاصة بمقدم الخدمة.",
      },
      {
        text: "تُعالج المدفوعات عبر شركاء الدفع الآمنين لدينا. لا يتم تخزين البيانات المصرفية الكاملة على خوادمنا.",
      },
      {
        text: "يظل مقدم الخدمة مسؤولاً عن التنفيذ السليم للخدمة المحجوزة.",
      },
    ],
  },
  {
    id: "cancellation-policy",
    title: "الإلغاء والاسترداد",
    bullets: [
      {
        text: "قد يتضمن كل عرض شروط إلغاء خاصة به، معروضة بوضوح قبل تأكيد الحجز.",
      },
      {
        text: "في حالة الإلغاء من قبل مقدم الخدمة، يحق للمستخدم استرداد المبلغ المدفوع بالكامل.",
      },
      {
        text: "تعتمد مهلة الاسترداد أيضًا على مزود الدفع المستخدم.",
      },
      {
        text: "قد تؤدي الإلغاءات المسيئة أو المتكررة أو المخالفة لقواعد المنصة إلى قيود على الحساب.",
      },
    ],
  },
  {
    id: "user-conduct",
    title: "سلوك المستخدم",
    intro: "يلتزم المستخدم باستخدام المنصة بشكل نزيه ووفقًا للقانون.",
    bullets: [
      {
        text: "يُحظر على وجه الخصوص:",
        children: [
          { text: "الحجوزات الوهمية أو المدفوعات الاحتيالية" },
          { text: "التعليقات المهينة أو المشينة أو الكاذبة" },
          { text: "التلاعب بنظام الحجز أو الدفع أو العمولات" },
          { text: "أي استخدام غير قانوني أو ضار أو خادع للمنصة" },
        ],
      },
      {
        text: "يجب على المستخدم احترام قواعد المكان والمواعيد وتعليمات السلامة وتوجيهات مقدم الخدمة.",
      },
    ],
  },
  {
    id: "host-obligations",
    title: "التزامات مقدم الخدمة",
    intro:
      "يظل مقدم الخدمة المسؤول الوحيد عن محتوى عرضه وتنفيذ الخدمة المقترحة.",
    bullets: [
      {
        text: "نشر معلومات دقيقة وشفافة ومحدثة حول العروض والأسعار والتوافر والقيود.",
      },
      {
        text: "الحصول على التصاريح والتراخيص والتأمينات والحقوق اللازمة لعرض العرض المنشور.",
      },
      {
        text: "تقديم صور ومقاطع فيديو حقيقية ودقيقة وخالية من الحقوق.",
      },
      {
        text: "الوفاء بالحجوزات المؤكدة وضمان مستوى السلامة والنظافة والجودة المتوافق مع الوصف.",
      },
      {
        text: "التعاون مع Okeyo Travel في حالة النزاع أو المطالبة أو الحادث المرتبط بحجز.",
      },
    ],
  },
  {
    id: "intellectual-property",
    title: "الملكية الفكرية",
    bullets: [
      {
        text: "تظل العناصر الرسومية والعلامات التجارية والشعارات والنصوص وواجهات المنصة ملكاً لـ Okeyo Travel أو المرخصين لها.",
      },
      {
        text: "تحتفظ بحقوق المحتوى الذي تنشره، لكنك تمنح Okeyo Travel الترخيص اللازم لاستضافته وعرضه وترويج العروض على قنواتها.",
      },
      {
        text: "يُحظر نسخ أو استنساخ أو استخراج أو استغلال المحتوى أو العلامة التجارية دون إذن مسبق.",
      },
    ],
  },
  {
    id: "limitation-of-liability",
    title: "تحديد المسؤولية",
    bullets: [
      {
        text: "تعمل Okeyo Travel كوسيط بين المستخدمين ومقدمي الخدمات ولا تحل محل التزاماتهم respective.",
      },
      {
        text: "لا يمكننا تحمّل المسؤولية عن التأخير أو الإلغاء أو الحوادث أو الخسائر أو الأضرار الناجمة عن مقدم خدمة أو حدث خارجي خارج عن سيطرتنا المعقولة.",
      },
      {
        text: "تظل كل طرف مسؤولاً عن تصريحاته وسلوكه والامتثال للقوانين المطبقة عليه.",
      },
    ],
  },
  {
    id: "dispute-resolution",
    title: "النزاعات والقانون المطبق",
    paragraphs: [
      "في حالة النزاع، تتفق الأطراف على السعي أولاً لحل ودي بمساعدة دعم Okeyo Travel.",
      "فشل التوصل إلى اتفاق ودي، قد يُحال النزاع إلى المحاكم المختصة في المغرب، مع مراعاة قواعد حماية المستهلك الإلزامية.",
    ],
  },
  {
    id: "changes-to-terms",
    title: "تعديل الشروط",
    paragraphs: [
      "يجوز لنا تحديث هذه الشروط لعكس تطور المنصة أو الالتزامات القانونية أو نموذج خدماتنا.",
      "في حالة تغييرات مهمة، سننشر نسخة محدثة على هذه الصفحة وقد نخطرك عبر البريد الإلكتروني أو التطبيق.",
    ],
  },
  {
    id: "contact",
    title: "اتصل بنا",
    bullets: [
      { text: "الدعم العام: support@okeyo.ma" },
      { text: "الاستفسارات القانونية: legal@okeyo.ma" },
      { text: "عنوان الاتصال: Okeyo Travel، المغرب" },
    ],
  },
];

const frPrivacySections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      "La présente Politique de confidentialité explique comment okeyo travel collecte, utilise, partage et protège vos données personnelles lorsque vous utilisez la plateforme.",
      "Nous nous engageons à traiter ces informations avec transparence, sécurité et conformément aux lois applicables.",
    ],
  },
  {
    id: "data-we-collect",
    title: "Données que Nous Collectons",
    intro:
      "Nous collectons les informations nécessaires pour créer un compte, gérer les réservations et améliorer l'expérience utilisateur.",
    bullets: [
      {
        text: "Informations de compte :",
        children: [
          { text: "nom, prénom, e-mail et numéro de téléphone" },
          {
            text: "photo de profil et préférences de compte si vous les renseignez",
          },
        ],
      },
      {
        text: "Informations de réservation :",
        children: [
          {
            text: "dates, nombre de voyageurs, options sélectionnées et historique des transactions",
          },
          { text: "coordonnées nécessaires au traitement de la réservation" },
        ],
      },
      {
        text: "Données prestataire :",
        children: [
          {
            text: "informations professionnelles et détails des offres publiées",
          },
          {
            text: "calendriers, photos, descriptions et informations de versement",
          },
        ],
      },
      {
        text: "Données techniques et d'usage :",
        children: [
          {
            text: "adresse IP, type d'appareil, système d'exploitation et journaux techniques",
          },
          {
            text: "pages consultées, recherches, favoris et interactions avec la plateforme",
          },
        ],
      },
    ],
  },
  {
    id: "how-we-use-data",
    title: "Comment Nous Utilisons les Données",
    bullets: [
      {
        text: "Fournir nos services :",
        children: [
          { text: "créer et gérer votre compte" },
          { text: "traiter les réservations et paiements" },
          {
            text: "faciliter les échanges entre utilisateurs, prestataires et support",
          },
        ],
      },
      {
        text: "Améliorer l'expérience :",
        children: [
          { text: "personnaliser les résultats et recommandations" },
          {
            text: "mesurer l'utilisation de la plateforme et développer de nouvelles fonctionnalités",
          },
        ],
      },
      {
        text: "Sécurité et conformité :",
        children: [
          { text: "prévenir la fraude, les abus et les activités illégales" },
          {
            text: "respecter nos obligations légales, comptables et réglementaires",
          },
        ],
      },
    ],
  },
  {
    id: "data-sharing",
    title: "Partage des Données",
    bullets: [
      {
        text: "Avec les prestataires : nous partageons les informations nécessaires à l'exécution de la réservation.",
      },
      {
        text: "Avec nos sous-traitants : hébergement cloud, analyse, support client, notifications et prestataires de paiement.",
      },
      {
        text: "Avec les autorités compétentes lorsque la loi l'exige ou pour protéger nos droits, nos utilisateurs ou la sécurité de la plateforme.",
      },
      {
        text: "Avec votre consentement lorsque vous choisissez explicitement une intégration ou un partage spécifique.",
      },
    ],
    paragraphs: [
      "Nous ne vendons pas vos données personnelles à des tiers à des fins commerciales.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies et Technologies Similaires",
    bullets: [
      {
        text: "Cookies essentiels pour maintenir la session, sécuriser la connexion et mémoriser certaines préférences.",
      },
      {
        text: "Outils de mesure d'audience et de performance pour comprendre l'usage du produit et améliorer nos interfaces.",
      },
      {
        text: "Technologies de personnalisation et de communication, sous réserve des réglages disponibles sur votre appareil ou navigateur.",
      },
    ],
  },
  {
    id: "data-retention",
    title: "Conservation des Données",
    bullets: [
      {
        text: "Les données de compte sont conservées tant que votre compte reste actif, puis pendant une durée raisonnable pour gérer les obligations légales ou les litiges.",
      },
      {
        text: "Les données de réservation et de paiement peuvent être conservées plus longtemps pour répondre aux obligations comptables, fiscales ou réglementaires.",
      },
      {
        text: "Les journaux techniques sont conservés pendant une période limitée nécessaire à la sécurité, au support et à l'analyse produit.",
      },
    ],
  },
  {
    id: "your-rights",
    title: "Vos Droits",
    intro:
      "Selon la loi applicable, vous pouvez exercer plusieurs droits sur vos données personnelles.",
    bullets: [
      {
        text: "Demander l'accès aux données que nous détenons à votre sujet.",
      },
      {
        text: "Demander la correction ou la mise à jour des informations inexactes.",
      },
      {
        text: "Demander l'effacement, la limitation du traitement ou la portabilité de vos données lorsque ces droits s'appliquent.",
      },
      {
        text: "Vous opposer à certains traitements, notamment liés au marketing direct.",
      },
      {
        text: "Retirer votre consentement lorsque le traitement repose sur ce fondement.",
      },
    ],
    paragraphs: [
      "Pour exercer ces droits, contactez-nous à privacy@okeyo.ma. Nous répondrons dans les délais requis par la réglementation applicable.",
    ],
  },
  {
    id: "security",
    title: "Sécurité",
    bullets: [
      {
        text: "Nous mettons en place des mesures techniques et organisationnelles destinées à protéger les données contre l'accès non autorisé, la perte, l'altération ou la divulgation.",
      },
      {
        text: "Les données sensibles sont protégées par des contrôles d'accès, du chiffrement en transit et des pratiques de surveillance adaptées.",
      },
      {
        text: "Les paiements sont traités par des partenaires spécialisés conformes aux standards de sécurité applicables.",
      },
    ],
  },
  {
    id: "childrens-privacy",
    title: "Données des Mineurs",
    paragraphs: [
      "okeyo travel n'est pas destiné aux personnes de moins de 18 ans. Nous ne collectons pas sciemment de données personnelles de mineurs.",
      "Si vous pensez qu'un mineur nous a transmis des informations personnelles, contactez-nous afin que nous puissions examiner et supprimer ces données si nécessaire.",
    ],
  },
  {
    id: "changes-to-policy",
    title: "Modifications de la Politique",
    paragraphs: [
      "Cette politique peut être mise à jour pour refléter des évolutions légales, techniques ou opérationnelles.",
      "La version la plus récente est toujours publiée sur cette page avec sa date de mise à jour.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    bullets: [
      { text: "Confidentialité : privacy@okeyo.ma" },
      { text: "Support : support@okeyo.ma" },
      { text: "Adresse de contact : okeyo travel, Maroc" },
    ],
  },
];

const enPrivacySections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      "This Privacy Policy explains how Okeyo Travel collects, uses, shares, and protects your personal data when you use the platform.",
      "We are committed to handling this information with transparency, security, and in accordance with applicable laws.",
    ],
  },
  {
    id: "data-we-collect",
    title: "Data We Collect",
    intro:
      "We collect the information necessary to create an account, manage bookings, and improve the user experience.",
    bullets: [
      {
        text: "Account information:",
        children: [
          { text: "first name, last name, email, and phone number" },
          {
            text: "profile picture and account preferences if you provide them",
          },
        ],
      },
      {
        text: "Booking information:",
        children: [
          {
            text: "dates, number of travelers, selected options, and transaction history",
          },
          { text: "contact details required to process the booking" },
        ],
      },
      {
        text: "Provider data:",
        children: [
          { text: "professional information and details of published offers" },
          { text: "calendars, photos, descriptions, and payout information" },
        ],
      },
      {
        text: "Technical and usage data:",
        children: [
          {
            text: "IP address, device type, operating system, and technical logs",
          },
          {
            text: "pages viewed, searches, favorites, and interactions with the platform",
          },
        ],
      },
    ],
  },
  {
    id: "how-we-use-data",
    title: "How We Use Your Data",
    bullets: [
      {
        text: "Provide our services:",
        children: [
          { text: "create and manage your account" },
          { text: "process bookings and payments" },
          {
            text: "facilitate communication between users, providers, and support",
          },
        ],
      },
      {
        text: "Improve the experience:",
        children: [
          { text: "personalize results and recommendations" },
          { text: "measure platform usage and develop new features" },
        ],
      },
      {
        text: "Security and compliance:",
        children: [
          { text: "prevent fraud, abuse, and illegal activities" },
          { text: "meet our legal, accounting, and regulatory obligations" },
        ],
      },
    ],
  },
  {
    id: "data-sharing",
    title: "Data Sharing",
    bullets: [
      {
        text: "With providers: we share the information necessary to fulfill the booking.",
      },
      {
        text: "With our subcontractors: cloud hosting, analytics, customer support, notifications, and payment providers.",
      },
      {
        text: "With competent authorities when required by law or to protect our rights, our users, or platform security.",
      },
      {
        text: "With your consent when you explicitly choose an integration or specific sharing.",
      },
    ],
    paragraphs: [
      "We do not sell your personal data to third parties for commercial purposes.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and Similar Technologies",
    bullets: [
      {
        text: "Essential cookies to maintain the session, secure login, and remember certain preferences.",
      },
      {
        text: "Audience and performance measurement tools to understand product usage and improve our interfaces.",
      },
      {
        text: "Personalization and communication technologies, subject to settings available on your device or browser.",
      },
    ],
  },
  {
    id: "data-retention",
    title: "Data Retention",
    bullets: [
      {
        text: "Account data is retained as long as your account remains active, then for a reasonable period to manage legal obligations or disputes.",
      },
      {
        text: "Booking and payment data may be retained longer to meet accounting, tax, or regulatory obligations.",
      },
      {
        text: "Technical logs are retained for a limited period necessary for security, support, and product analysis.",
      },
    ],
  },
  {
    id: "your-rights",
    title: "Your Rights",
    intro:
      "Under applicable law, you may exercise several rights regarding your personal data.",
    bullets: [
      {
        text: "Request access to the data we hold about you.",
      },
      {
        text: "Request correction or updating of inaccurate information.",
      },
      {
        text: "Request erasure, restriction of processing, or portability of your data when these rights apply.",
      },
      {
        text: "Object to certain processing, in particular related to direct marketing.",
      },
      {
        text: "Withdraw your consent when processing is based on this legal ground.",
      },
    ],
    paragraphs: [
      "To exercise these rights, contact us at privacy@okeyo.ma. We will respond within the time limits required by applicable regulation.",
    ],
  },
  {
    id: "security",
    title: "Security",
    bullets: [
      {
        text: "We implement technical and organizational measures designed to protect data against unauthorized access, loss, alteration, or disclosure.",
      },
      {
        text: "Sensitive data is protected by access controls, encryption in transit, and appropriate monitoring practices.",
      },
      {
        text: "Payments are processed by specialized partners compliant with applicable security standards.",
      },
    ],
  },
  {
    id: "childrens-privacy",
    title: "Children's Data",
    paragraphs: [
      "Okeyo Travel is not intended for individuals under 18 years of age. We do not knowingly collect personal data from minors.",
      "If you believe a minor has provided us with personal information, please contact us so we can review and delete that data if necessary.",
    ],
  },
  {
    id: "changes-to-policy",
    title: "Changes to This Policy",
    paragraphs: [
      "This policy may be updated to reflect legal, technical, or operational developments.",
      "The most recent version is always published on this page with its update date.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    bullets: [
      { text: "Privacy: privacy@okeyo.ma" },
      { text: "Support: support@okeyo.ma" },
      { text: "Contact address: Okeyo Travel, Morocco" },
    ],
  },
];

const arPrivacySections: LegalSection[] = [
  {
    id: "introduction",
    title: "مقدمة",
    paragraphs: [
      "تشرح سياسة الخصوصية هذه كيف تجمع Okeyo Travel بياناتك الشخصية وتستخدمها وتشاركها وتحميها عند استخدامك للمنصة.",
      "نلتزم بالتعامل مع هذه المعلومات بشفافية وأمان ووفقًا للقوانين المعمول بها.",
    ],
  },
  {
    id: "data-we-collect",
    title: "البيانات التي نجمعها",
    intro:
      "نجمع المعلومات اللازمة لإنشاء حساب وإدارة الحجوزات وتحسين تجربة المستخدم.",
    bullets: [
      {
        text: "معلومات الحساب:",
        children: [
          { text: "الاسم واللقب والبريد الإلكتروني ورقم الهاتف" },
          { text: "صورة الملف الشخصي وتفضيلات الحساب إذا قمت بإدخالها" },
        ],
      },
      {
        text: "معلومات الحجز:",
        children: [
          { text: "التواريخ وعدد المسافرين والخيارات المحددة وسجل المعاملات" },
          { text: "بيانات الاتصال اللازمة لمعالجة الحجز" },
        ],
      },
      {
        text: "بيانات مقدم الخدمة:",
        children: [
          { text: "المعلومات المهنية وتفاصيل العروض المنشورة" },
          { text: "التقويمات والصور والأوصاف ومعلومات التحويلات" },
        ],
      },
      {
        text: "البيانات التقنية وبيانات الاستخدام:",
        children: [
          { text: "عنوان IP ونوع الجهاز ونظام التشغيل والسجلات التقنية" },
          { text: "الصفحات المشاهدة والبحوث والمفضلات والتفاعلات مع المنصة" },
        ],
      },
    ],
  },
  {
    id: "how-we-use-data",
    title: "كيف نستخدم بياناتك",
    bullets: [
      {
        text: "تقديم خدماتنا:",
        children: [
          { text: "إنشاء وإدارة حسابك" },
          { text: "معالجة الحجوزات والمدفوعات" },
          { text: "تسهيل التواصل بين المستخدمين ومقدمي الخدمات والدعم" },
        ],
      },
      {
        text: "تحسين التجربة:",
        children: [
          { text: "تخصيص النتائج والتوصيات" },
          { text: "قياس استخدام المنصة وتطوير ميزات جديدة" },
        ],
      },
      {
        text: "الأمان والامتثال:",
        children: [
          { text: "منع الاحتيال والإساءة والأنشطة غير القانونية" },
          { text: "الوفاء بالالتزامات القانونية والمحاسبية والتنظيمية" },
        ],
      },
    ],
  },
  {
    id: "data-sharing",
    title: "مشاركة البيانات",
    bullets: [
      {
        text: "مع مقدمي الخدمات: نشارك المعلومات اللازمة لتنفيذ الحجز.",
      },
      {
        text: "مع مقاولينا الفرعيين: الاستضافة السحابية والتحليلات ودعم العملاء والإشعارات ومزودي الدفع.",
      },
      {
        text: "مع السلطات المختصة عندما يقتضي القانون ذلك أو لحماية حقوقنا أو مستخدمينا أو أمان المنصة.",
      },
      {
        text: "بموافقتك عندما تختار صراحةً تكاملاً أو مشاركة محددة.",
      },
    ],
    paragraphs: ["لا نبيع بياناتك الشخصية لأطراف ثالثة لأغراض تجارية."],
  },
  {
    id: "cookies",
    title: "ملفات تعريف الارتباط والتقنيات المشابهة",
    bullets: [
      {
        text: "ملفات تعريف ارتباط ضرورية للحفاظ على الجلسة وتأمين تسجيل الدخول وتذكر بعض التفضيلات.",
      },
      {
        text: "أدوات قياس الجمهور والأداء لفهم استخدام المنتج وتحسين واجهاتنا.",
      },
      {
        text: "تقنيات التخصيص والتواصل، وفقًا للإعدادات المتاحة على جهازك أو متصفحك.",
      },
    ],
  },
  {
    id: "data-retention",
    title: "الاحتفاظ بالبيانات",
    bullets: [
      {
        text: "تحتفظ بيانات الحساب طالما يظل حسابك نشطًا، ثم لمدة معقولة لإدارة الالتزامات القانونية أو النزاعات.",
      },
      {
        text: "قد تُحفظ بيانات الحجز والدفع لفترة أطول للوفاء بالالتزامات المحاسبية أو الضريبية أو التنظيمية.",
      },
      {
        text: "تُحفظ السجلات التقنية لفترة محدودة ضرورية للأمان والدعم وتحليل المنتج.",
      },
    ],
  },
  {
    id: "your-rights",
    title: "حقوقك",
    intro:
      "بموجب القانون المعمول به، يمكنك ممارسة عدة حقوق فيما يتعلق ببياناتك الشخصية.",
    bullets: [
      {
        text: "طلب الوصول إلى البيانات التي نحتفظ بها عنك.",
      },
      {
        text: "طلب تصحيح أو تحديث المعلومات غير الدقيقة.",
      },
      {
        text: "طلب الحذف أو تقييد المعالجة أو نقل بياناتك عندما تنطبق هذه الحقوق.",
      },
      {
        text: "الاعتراض على بعض أشكال المعالجة، لا سيما المتعلقة بالتسويق المباشر.",
      },
      {
        text: "سحب موافقتك عندما يستند المعالجة إلى هذا الأساس القانوني.",
      },
    ],
    paragraphs: [
      "لممارسة هذه الحقوق، تواصل معنا على privacy@okeyo.ma. سنرد ضمن المهلة الزمنية المطلوبة باللوائح المعمول بها.",
    ],
  },
  {
    id: "security",
    title: "الأمان",
    bullets: [
      {
        text: "ننفذ تدابير تقنية وتنظيمية مصممة لحماية البيانات من الوصول غير المصرح به أو الفقد أو التغيير أو الإفصاح.",
      },
      {
        text: "تُحمى البيانات الحساسة بواسطة ضوابط الوصول والتشفير أثناء النقل وممارسات المراقبة المناسبة.",
      },
      {
        text: "تُعالج المدفوعات بواسطة شركاء متخصصين متوافقين مع معايير الأمان المعمول بها.",
      },
    ],
  },
  {
    id: "childrens-privacy",
    title: "بيانات القاصرين",
    paragraphs: [
      "لا تستهدف Okeyo Travel الأشخاص دون سن 18 عامًا. لا نجمع عن قصد بيانات شخصية من قاصرين.",
      "إذا كنت تعتقد أن قاصرًا قد زودنا بمعلومات شخصية، يرجى التواصل معنا حتى نتمكن من مراجعتها وحذفها إذا لزم الأمر.",
    ],
  },
  {
    id: "changes-to-policy",
    title: "تعديلات على السياسة",
    paragraphs: [
      "قد تُحدّث هذه السياسة لتعكس التطورات القانونية أو التقنية أو التشغيلية.",
      "تُنشر النسخة الأحدث دائمًا على هذه الصفحة مع تاريخ التحديث.",
    ],
  },
  {
    id: "contact",
    title: "اتصل بنا",
    bullets: [
      { text: "الخصوصية: privacy@okeyo.ma" },
      { text: "الدعم: support@okeyo.ma" },
      { text: "عنوان الاتصال: Okeyo Travel، المغرب" },
    ],
  },
];

const TERMS_SECTIONS_MAP: Record<AppLocale, LegalSection[]> = {
  fr: frTermsSections,
  en: enTermsSections,
  ar: arTermsSections,
};

const PRIVACY_SECTIONS_MAP: Record<AppLocale, LegalSection[]> = {
  fr: frPrivacySections,
  en: enPrivacySections,
  ar: arPrivacySections,
};

export function getTermsSections(locale: AppLocale): LegalSection[] {
  return TERMS_SECTIONS_MAP[locale] ?? frTermsSections;
}

export function getPrivacySections(locale: AppLocale): LegalSection[] {
  return PRIVACY_SECTIONS_MAP[locale] ?? frPrivacySections;
}

// Kept for backward compatibility; prefer getLegalLastUpdated(locale)
export const LEGAL_LAST_UPDATED = "13 mars 2026";
