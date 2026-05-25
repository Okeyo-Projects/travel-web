import type { AppLocale } from "@/lib/i18n";

export type PartnerPageCopy = {
  seo: {
    title: string;
    description: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    audience: string[];
  };
  showcase: {
    eyebrow: string;
    title: string;
    description: string;
    points: string[];
    stats: Array<{
      value: string;
      label: string;
    }>;
  };
  benefits: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{
      title: string;
      description: string;
    }>;
  };
  process: {
    eyebrow: string;
    title: string;
    description: string;
    steps: Array<{
      title: string;
      description: string;
    }>;
  };
  contact: {
    eyebrow: string;
    title: string;
    description: string;
    emailTitle: string;
    emailDescription: string;
    phoneTitle: string;
    phoneDescription: string;
    responseTitle: string;
    responseDescription: string;
    responseValue: string;
  };
  form: {
    badge: string;
    title: string;
    description: string;
    firstNameLabel: string;
    firstNamePlaceholder: string;
    establishmentLabel: string;
    establishmentPlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    phoneCountryLabel: string;
    helper: string;
    submit: string;
    submitting: string;
    privacy: string;
    successTitle: string;
    successDescription: string;
    successCta: string;
    errors: {
      firstName: string;
      establishmentName: string;
      phone: string;
      submit: string;
    };
  };
};

export const partnerPageCopy: Record<AppLocale, PartnerPageCopy> = {
  fr: {
    seo: {
      title: "Devenir partenaire hébergement au Maroc | Okeyo Travel",
      description:
        "Référencez votre riad, hôtel, maison d’hôtes ou lodge sur Okeyo Travel et recevez des demandes de voyageurs plus qualifiées au Maroc.",
    },
    hero: {
      eyebrow: "Partenariat hébergement",
      title:
        "Faites entrer votre établissement dans les recommandations Okeyo.",
      description:
        "Riads, maisons d’hôtes, hôtels, auberges etc: Okeyo aide les voyageurs à trouver le bon lieu plus vite, et aide les partenaires à recevoir des demandes mieux qualifiées.",
      primaryCta: "Demander un rappel",
      secondaryCta: "Voir comment ça marche",
      audience: ["Riads", "Hôtels", "Maisons d’hôtes", "Auberges"],
    },
    showcase: {
      eyebrow: "Une vitrine pensée pour convertir",
      title:
        "Votre établissement présenté avec le bon contexte, au bon moment.",
      description:
        "Notre assistant IA capte l’intention du voyageur, affine le besoin, puis met en avant les hébergements les plus pertinents. Vous recevez ainsi des contacts plus mûrs, avec une meilleure compréhension du séjour recherché.",
      points: [
        "Des voyageurs déjà qualifiés avant la mise en relation.",
        "Une présentation plus claire de votre offre, de votre ambiance et de votre emplacement.",
        "Un accompagnement humain pour l’onboarding et la mise en ligne.",
      ],
      stats: [
        {
          value: "3 langues",
          label: "Une vitrine disponible en français, anglais et arabe.",
        },
        {
          value: "IA + humain",
          label:
            "Qualification automatique puis accompagnement de l’équipe Okeyo.",
        },
        {
          value: "Sous 24 h",
          label: "Premier retour visé après votre demande de partenariat.",
        },
      ],
    },
    benefits: {
      eyebrow: "Pourquoi rejoindre Okeyo",
      title: "Un canal plus clair, plus sélectif, plus simple à activer.",
      description:
        "Nous ne cherchons pas seulement à ajouter des annonces. Nous construisons un catalogue utile, crédible et facile à réserver pour les voyageurs comme pour les partenaires.",
      items: [
        {
          title: "Demandes mieux qualifiées",
          description:
            "L’assistant Okeyo aide les voyageurs à formuler leur besoin avant même qu’ils découvrent votre établissement.",
        },
        {
          title: "Mise en avant contextualisée",
          description:
            "Votre hébergement apparaît avec le bon angle: type de séjour, ambiance, capacité, ville et expérience attendue.",
        },
        {
          title: "Onboarding accompagné",
          description:
            "Notre équipe vous aide à structurer les informations clés pour que votre fiche soit claire dès le départ.",
        },
        {
          title: "Présence premium sur un produit éditorial",
          description:
            "Okeyo combine recommandation, contenu et accompagnement, au lieu d’afficher une simple liste impersonnelle.",
        },
      ],
    },
    process: {
      eyebrow: "Comment ça marche",
      title: "Un parcours simple avant la mise en ligne.",
      description:
        "Le formulaire reste volontairement court. Une fois votre demande reçue, nous reprenons la suite avec vous.",
      steps: [
        {
          title: "1. Vous laissez vos coordonnées",
          description:
            "Nom complet, nom de l’établissement et numéro de téléphone suffisent pour lancer la discussion.",
        },
        {
          title: "2. L’équipe Okeyo vous rappelle",
          description:
            "Nous comprenons votre positionnement, vos disponibilités et le type de voyageurs que vous ciblez.",
        },
        {
          title: "3. Nous préparons votre visibilité",
          description:
            "Nous organisons les informations essentielles pour intégrer votre établissement dans l’expérience Okeyo.",
        },
      ],
    },
    contact: {
      eyebrow: "Contact direct",
      title: "Vous préférez parler à quelqu’un tout de suite ?",
      description:
        "Appelez-nous ou écrivez-nous directement. Chaque carte ouvre le bon canal en un clic.",
      emailTitle: "E-mail partenariat",
      emailDescription:
        "Pour envoyer une présentation rapide de votre établissement ou poser une question détaillée.",
      phoneTitle: "Téléphone",
      phoneDescription: "Pour un premier échange rapide avec l’équipe Okeyo.",
      responseTitle: "Délai visé",
      responseDescription:
        "Nous revenons généralement vers les nouvelles demandes de partenariat sous un jour ouvré.",
      responseValue: "Sous 24 heures",
    },
    form: {
      badge: "Demande de partenariat",
      title: "Parlez-nous de votre établissement",
      description:
        "Nous vous recontactons rapidement pour comprendre votre offre et voir comment l’intégrer à Okeyo.",
      firstNameLabel: "Nom complet",
      firstNamePlaceholder: "Votre nom complet",
      establishmentLabel: "Nom de l’établissement",
      establishmentPlaceholder: "Riad, hôtel, maison d’hôtes...",
      phoneLabel: "Numéro de téléphone",
      phonePlaceholder: "6 12 34 56 78",
      phoneCountryLabel: "Pays du numéro",
      helper:
        "Un formulaire court pour vous rappeler vite, sans vous faire perdre de temps.",
      submit: "Envoyer ma demande",
      submitting: "Envoi en cours...",
      privacy:
        "En envoyant ce formulaire, vous acceptez d’être recontacté par Okeyo au sujet de ce partenariat.",
      successTitle: "Merci, votre demande est bien reçue.",
      successDescription:
        "Notre équipe reviendra vers vous rapidement pour échanger sur votre établissement et la suite.",
      successCta: "Envoyer une autre demande",
      errors: {
        firstName: "Veuillez renseigner votre nom complet.",
        establishmentName: "Veuillez renseigner le nom de l’établissement.",
        phone: "Veuillez saisir un numéro valide pour le pays sélectionné.",
        submit: "Impossible d’envoyer la demande pour le moment.",
      },
    },
  },
  en: {
    seo: {
      title: "Become an accommodation partner in Morocco | Okeyo Travel",
      description:
        "List your riad, hotel, guest house, or lodge on Okeyo Travel and receive better qualified traveler inquiries in Morocco.",
    },
    hero: {
      eyebrow: "Accommodation partnerships",
      title: "Bring your property into Okeyo’s recommendation flow.",
      description:
        "Riads, guest houses, hotels, lodges, and signature stays: Okeyo helps travelers find the right place faster, and helps partners receive more qualified interest.",
      primaryCta: "Request a call back",
      secondaryCta: "See how it works",
      audience: ["Riads", "Hotels", "Guest houses", "Lodges"],
    },
    showcase: {
      eyebrow: "A storefront built to convert",
      title:
        "Your property positioned with the right context, at the right moment.",
      description:
        "Our AI assistant captures traveler intent, refines the need, and then surfaces the most relevant stays. That means better-qualified leads and clearer expectations before the conversation starts.",
      points: [
        "Travelers are qualified before they reach your property.",
        "Your offer is presented with clearer context around mood, location, and stay style.",
        "Human onboarding support helps shape your listing from day one.",
      ],
      stats: [
        {
          value: "3 languages",
          label: "A storefront available in French, English, and Arabic.",
        },
        {
          value: "AI + human",
          label: "Automated qualification backed by Okeyo’s team.",
        },
        {
          value: "< 24h",
          label: "Target first response window after a partnership request.",
        },
      ],
    },
    benefits: {
      eyebrow: "Why join Okeyo",
      title: "A clearer, more selective, easier channel to activate.",
      description:
        "We are not trying to stuff more listings into a marketplace. We are building a catalog travelers can trust and partners can actually benefit from.",
      items: [
        {
          title: "Better-qualified inquiries",
          description:
            "The Okeyo assistant helps travelers express what they want before they ever discover your property.",
        },
        {
          title: "Contextual visibility",
          description:
            "Your stay appears through the right angle: trip type, atmosphere, city, capacity, and traveler expectations.",
        },
        {
          title: "Guided onboarding",
          description:
            "Our team helps structure the key details so your listing is useful from the start.",
        },
        {
          title: "Premium presence inside an editorial product",
          description:
            "Okeyo blends recommendation, content, and assistance instead of showing travelers a flat inventory list.",
        },
      ],
    },
    process: {
      eyebrow: "How it works",
      title: "A simple path before launch.",
      description:
        "The form stays intentionally short. Once we receive it, our team takes the next step with you directly.",
      steps: [
        {
          title: "1. Leave your contact details",
          description:
            "Full name, property name, and phone number are enough to start the discussion.",
        },
        {
          title: "2. Okeyo calls you back",
          description:
            "We learn about your positioning, availability, and the type of travelers you want to attract.",
        },
        {
          title: "3. We prepare your visibility",
          description:
            "We organize the core information needed to fit your property into the Okeyo experience.",
        },
      ],
    },
    contact: {
      eyebrow: "Direct contact",
      title: "Prefer to talk to someone right away?",
      description:
        "Call or email us directly. Each card opens the right channel in one click.",
      emailTitle: "Partnership email",
      emailDescription:
        "Use this for a quick property intro or a more detailed question.",
      phoneTitle: "Phone",
      phoneDescription: "Use this for a quick first conversation with Okeyo.",
      responseTitle: "Target response time",
      responseDescription:
        "We usually reply to new partnership requests within one business day.",
      responseValue: "Within 24 hours",
    },
    form: {
      badge: "Partnership request",
      title: "Tell us about your property",
      description:
        "We will contact you quickly to understand your offer and see how it can fit into Okeyo.",
      firstNameLabel: "Full name",
      firstNamePlaceholder: "Your full name",
      establishmentLabel: "Property name",
      establishmentPlaceholder: "Riad, hotel, guest house...",
      phoneLabel: "Phone number",
      phonePlaceholder: "6 12 34 56 78",
      phoneCountryLabel: "Phone country",
      helper:
        "A short form designed to get you a quick call back without unnecessary friction.",
      submit: "Send my request",
      submitting: "Sending...",
      privacy:
        "By sending this form, you agree to be contacted by Okeyo about this partnership request.",
      successTitle: "Thanks, your request has been received.",
      successDescription:
        "Our team will get back to you shortly to discuss your property and the next steps.",
      successCta: "Send another request",
      errors: {
        firstName: "Please enter your full name.",
        establishmentName: "Please enter the property name.",
        phone: "Please enter a valid phone number for the selected country.",
        submit: "We could not send your request right now.",
      },
    },
  },
  ar: {
    seo: {
      title: "شراكة إقامة في المغرب | Okeyo Travel",
      description:
        "أضف الرياض أو الفندق أو دار الضيافة أو اللودج الخاصة بك إلى Okeyo Travel واحصل على طلبات سفر أكثر جودة في المغرب.",
    },
    hero: {
      eyebrow: "شراكات الإقامة",
      title: "اجعل مؤسستك جزءًا من توصيات Okeyo.",
      description:
        "الرياضات ودور الضيافة والفنادق واللودجات والإقامات المميزة: تساعد Okeyo المسافرين على العثور بسرعة أكبر على المكان المناسب، وتساعد الشركاء على تلقي طلبات أكثر تأهيلاً.",
      primaryCta: "اطلب مكالمة",
      secondaryCta: "اكتشف كيف نعمل",
      audience: ["رياض", "فندق", "دار ضيافة", "لودج"],
    },
    showcase: {
      eyebrow: "واجهة مصممة للتحويل",
      title: "نقدّم مؤسستك بالسياق الصحيح وفي اللحظة المناسبة.",
      description:
        "يلتقط مساعدنا الذكي نية المسافر ويصقل حاجته ثم يعرض أماكن الإقامة الأكثر ملاءمة. هكذا تصلك طلبات أوضح وتوقعات أدق قبل بدء التواصل.",
      points: [
        "المسافر يصل إليك بعد تأهيل أفضل لاحتياجه.",
        "يتم عرض مؤسستك مع توضيح الجو العام والموقع ونمط الإقامة المناسب.",
        "فريق Okeyo يرافقك خلال الإعداد والظهور الأول.",
      ],
      stats: [
        {
          value: "3 لغات",
          label: "واجهة متاحة بالفرنسية والإنجليزية والعربية.",
        },
        {
          value: "ذكاء + فريق",
          label: "تأهيل آلي مدعوم بمتابعة بشرية من فريق Okeyo.",
        },
        {
          value: "أقل من 24 ساعة",
          label: "المدة المستهدفة لأول رد بعد طلب الشراكة.",
        },
      ],
    },
    benefits: {
      eyebrow: "لماذا تنضم إلى Okeyo",
      title: "قناة أوضح، أكثر انتقائية، وأسهل في التفعيل.",
      description:
        "نحن لا نبحث فقط عن إضافة مزيد من القوائم. نحن نبني كتالوجًا موثوقًا ومفيدًا للمسافرين وفعّالًا للشركاء.",
      items: [
        {
          title: "طلبات أكثر تأهيلاً",
          description:
            "يساعد مساعد Okeyo المسافرين على تحديد ما يريدونه قبل أن يصلوا إلى مؤسستك.",
        },
        {
          title: "ظهور بسياق أدق",
          description:
            "تظهر إقامتك من خلال زاوية مناسبة: نوع الرحلة، الأجواء، المدينة، السعة، وتوقعات المسافر.",
        },
        {
          title: "مواكبة عند الانطلاق",
          description:
            "يساعدك فريقنا في تنظيم المعلومات الأساسية حتى تكون صفحتك واضحة منذ البداية.",
        },
        {
          title: "حضور أقوى داخل منتج تحريري",
          description:
            "تمزج Okeyo بين التوصية والمحتوى والمرافقة بدل عرض قائمة جامدة من الخيارات.",
        },
      ],
    },
    process: {
      eyebrow: "كيف يعمل الأمر",
      title: "مسار بسيط قبل الإطلاق.",
      description:
        "النموذج قصير عن قصد. بعد استلامه، يتواصل فريقنا معك مباشرة لاستكمال الخطوات.",
      steps: [
        {
          title: "1. اترك بياناتك",
          description: "يكفي الاسم الكامل واسم المؤسسة ورقم الهاتف لبدء النقاش.",
        },
        {
          title: "2. يتواصل معك فريق Okeyo",
          description: "نفهم تموقعك وتوفرك ونوع المسافرين الذين تستهدفهم.",
        },
        {
          title: "3. نجهز ظهورك",
          description:
            "ننظم المعلومات الأساسية لإدماج مؤسستك داخل تجربة Okeyo.",
        },
      ],
    },
    contact: {
      eyebrow: "تواصل مباشر",
      title: "تفضّل التحدث مع شخص مباشرة؟",
      description:
        "اتصل بنا أو راسلنا مباشرة. كل بطاقة تفتح القناة المناسبة بنقرة واحدة.",
      emailTitle: "بريد الشراكات",
      emailDescription: "لإرسال تقديم سريع عن مؤسستك أو طرح سؤال مفصل.",
      phoneTitle: "الهاتف",
      phoneDescription: "لبدء تواصل سريع مع فريق Okeyo.",
      responseTitle: "المدة المستهدفة",
      responseDescription:
        "نرد عادةً على طلبات الشراكة الجديدة خلال يوم عمل واحد.",
      responseValue: "خلال 24 ساعة",
    },
    form: {
      badge: "طلب شراكة",
      title: "أخبرنا عن مؤسستك",
      description:
        "سنتواصل معك سريعًا لفهم عرضك ومعرفة كيف يمكن دمجه داخل Okeyo.",
      firstNameLabel: "الاسم الكامل",
      firstNamePlaceholder: "اسمك الكامل",
      establishmentLabel: "اسم المؤسسة",
      establishmentPlaceholder: "رياض، فندق، دار ضيافة...",
      phoneLabel: "رقم الهاتف",
      phonePlaceholder: "6 12 34 56 78",
      phoneCountryLabel: "بلد الرقم",
      helper: "نموذج قصير حتى نعاود الاتصال بك بسرعة وبدون خطوات غير ضرورية.",
      submit: "إرسال الطلب",
      submitting: "جارٍ الإرسال...",
      privacy:
        "بإرسال هذا النموذج، فإنك توافق على أن تتواصل معك Okeyo بخصوص طلب الشراكة هذا.",
      successTitle: "شكرًا، تم استلام طلبك.",
      successDescription:
        "سيتواصل معك فريقنا قريبًا لمناقشة مؤسستك والخطوات التالية.",
      successCta: "إرسال طلب آخر",
      errors: {
        firstName: "يرجى إدخال اسمك الكامل.",
        establishmentName: "يرجى إدخال اسم المؤسسة.",
        phone: "يرجى إدخال رقم صالح للبلد المحدد.",
        submit: "تعذر إرسال الطلب حاليًا.",
      },
    },
  },
};
