"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Loader2, Globe } from "lucide-react";
import Image from "next/image";

type Language = 'fr' | 'ar';

const content = {
  fr: {
    welcome: "Merci et bienvenue dans l'univers Okeyo ! ✨",
    problem: "On sait ce que c’est : vouloir s’évader mais finir par rester chez soi parce que tout organiser est un vrai casse-tête. 🤯",
    solution: "C’est pour vous qu'on a créé Okeyo Travel.",
    valueProp: "Oubliez le stress des réservations : notre IA planifie votre détox de 3 jours en moins de 2 minutes. ⏱️",
    features: [
      "✨ Destination selon votre moral.",
      "✨ Activités & Transport inclus."
    ],
    cta_main: "Ne gérez plus rien, profitez enfin.",
    launch: "Lancement dans moins de 30 jours ! Votre accès exclusif et vos -20% arrivent par email une semaine avant. 🎁",
    form: {
      name: "Nom complet",
      namePlaceholder: "Votre nom",
      email: "Adresse email",
      emailPlaceholder: "votre@email.com",
      submit: "Rejoindre la liste d'attente",
      submitting: "Inscription...",
      success: "Merci ! Vous êtes sur la liste.",
      error: "Une erreur est survenue."
    },
    privacy: "Vos données sont protégées conformément à notre politique de confidentialité."
  },
  ar: {
    welcome: "Shokran u merhba bik f 3alam Okeyo! ✨",
    problem: "Kna 3arfin kifash katkun: baghi tsafar walakin katbqay f dark hitash takhtit s3ib. 🤯",
    solution: "Hadshi 3lash saybna Okeyo Travel lik.",
    valueProp: "Nsa sda3 d reservations: l'IA dialna katqad lik detox d 3 iam f ql mn 2 d qayq. ⏱️",
    features: [
      "✨ Wijha 3la hsab lgana.",
      "✨ Anshita u transport dakhl."
    ],
    cta_main: "Ma tdir walo, ghir stmte3. 💙🤖",
    launch: "Ghadi ntlaqaw fl qrib! Ghadi ywslek email fih -20% smana qbl l'lancement. 🎁",
    form: {
      name: "Smiya lkamila",
      namePlaceholder: "Smiytk",
      email: "L'email dialek",
      emailPlaceholder: "email@dialek.com",
      submit: "Dkhol la liste d'attente",
      submitting: "Kaytsjel...",
      success: "Shokran! Rak tqydti m3ana.",
      error: "Wqe3 shi mochkil."
    },
    privacy: "Ma tkhafsh 3la les données dialek, rahom mkhbyin mzyan."
  }
};

export default function PreOrderPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: ""
  });
  const [lang, setLang] = useState<Language>('fr');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; submit?: string }>({});

  const t = content[lang];

  const toggleLang = () => {
    setLang(prev => prev === 'fr' ? 'ar' : 'fr');
  };

  const validateForm = () => {
    const newErrors: { name?: string; email?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = lang === 'fr' ? "Veuillez entrer votre nom" : "3afak dkhl smiytk";
    }

    if (!formData.email.trim()) {
      newErrors.email = lang === 'fr' ? "Veuillez entrer votre email" : "3afak dkhl l'email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = lang === 'fr' ? "Format email invalide" : "Format d l'email mashi howa hadak";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/preorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      setIsSubmitted(true);
    } catch (error) {
      setErrors({ submit: t.form.error });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#fafafa]">

      {/* Background gradients for premium feel */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-200/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLang}
          className="rounded-full bg-white/50 backdrop-blur-md border border-gray-200 hover:bg-white/80 hover:text-gray-900 transition-all font-medium text-gray-700"
        >
          <Globe className="w-4 h-4 mr-2" />
          {lang === 'fr' ? 'العربية (Darija)' : 'Français'}
        </Button>
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center relative z-10">

        {/* Left Content */}
        <div className="space-y-8">
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-3xl shadow-xl shadow-purple-500/10 inline-block mb-4">
              <Image
                src="/logo.png"
                alt="Okeyo Logo"
                width={60}
                height={60}
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent leading-tight">
              {t.welcome}
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              {t.problem}
            </p>

            <div className="p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm text-left">
              <p className="font-semibold text-gray-900 mb-2">{t.solution}</p>
              <p className="text-gray-600">{t.valueProp}</p>
            </div>

            <ul className="space-y-3 text-left">
              {t.features.map((feature, idx) => (
                <li key={idx} className="text-gray-700 font-medium text-lg">
                  {feature}
                </li>
              ))}
            </ul>

            <p className="text-xl font-bold text-blue-600">
              {t.cta_main}
            </p>
          </div>
        </div>

        {/* Right Form Card */}
        <div>
          <Card className="p-8 lg:p-10 shadow-2xl bg-white/80 backdrop-blur-xl border-0 rounded-[2rem] ring-1 ring-gray-900/5">
            <div className="mb-8 text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-bold tracking-wide mb-4">
                COMING SOON
              </span>
              <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">
                {t.launch}
              </p>
            </div>

            {isSubmitted ? (
              <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t.form.success}</h3>
                <p className="text-gray-500">
                  {lang === 'fr' ? 'Surveillez votre boite email !' : 'Shoqi l\'email dialek !'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder={t.form.namePlaceholder}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-14 px-5 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-lg transition-all"
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder={t.form.emailPlaceholder}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-14 px-5 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-lg transition-all"
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-primary text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t.form.submitting}
                    </>
                  ) : (
                    t.form.submit
                  )}
                </Button>

                {errors.submit && <p className="text-center text-sm text-red-500">{errors.submit}</p>}

                <p className="text-xs text-center text-gray-400 mt-4">
                  {t.privacy}
                </p>
              </form>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}

