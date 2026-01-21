"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useRouter } from "next/navigation"

const TESTIMONIALS = [
  {
    id: 1,
    quote: "La meilleure expérience hôtelière de ma vie ! Le personnel était incroyable et la chambre impeccable. Emplacement parfait près de commodités incroyables. Je reviendrai certainement !",
    author: "Nouha J.",
    date: "Séjour en Juin 2024",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80",
    images: [
      "https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: 2,
    quote: "Un week-end inoubliable ! L'architecture est époustouflante et le service de conciergerie a organisé des excursions parfaites. Le spa est un incontournable.",
    author: "Ali L.",
    date: "Séjour en Août 2024",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: 3,
    quote: "L'assistant IA m'a fait gagner tellement de temps. J'ai trouvé exactement ce que je cherchais en quelques secondes. Une expérience fluide du début à la fin.",
    author: "Mouna W.",
    date: "Séjour en Septembre 2024",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80",
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ]
  }
]

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const router = useRouter()

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length)
  }

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  }

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    if (!isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
  }

  useEffect(() => {
    router.push("/preorder")
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased relative">
      {/* Header from Template */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute top-0 w-full z-50 py-6"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          {/* Navigation Left */}
          

          {/* Logo */}
          <Link href="/preorder" className="flex items-center gap-2 group">
            {/* <span className="font-display font-bold text-3xl text-white tracking-tight">
              Okeyo<span className="font-normal italic">Travel</span>
            </span> */}
            <Image 
              src="/logo_white.png" 
              alt="OkeyoTravel" 
              width={140} 
              height={100} 
              className="w-[90px] md:w-[140px] h-auto"
            />
          </Link>

          {/* Actions Right */}
          <div className="flex items-center gap-6">
     

            <nav className="hidden md:flex items-center gap-8">

            <Link href="/preorder" className="text-white/90 font-bold hover:text-white text-sm tracking-wide">
              Nos offres du moment
            </Link>
                        <Link href="/preorder" className="text-white/90 hover:text-white font-medium text-sm tracking-wide bg-foreground text-white px-8 py-3 rounded-full font-medium hover:bg-foreground/90 transition-colors">
              Explorer nos trésors
            </Link>
          </nav>
            {/* Mobile Menu Button */}
            <button type="button" className="md:hidden text-white" onClick={toggleMenu}>
              <span className="material-icons-round text-3xl">menu</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <div
          className={`fixed inset-0 z-40 bg-black/95 flex flex-col items-center justify-center space-y-8 transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
          }`}
        >
          <button type="button" className="absolute top-6 right-6 text-white" onClick={toggleMenu}>
            <span className="material-icons-round text-4xl">close</span>
          </button>
          <Link href="/preorder" className="text-white text-2xl font-display" onClick={toggleMenu}>
           Nos offres du moment
          </Link>
          <Link href="/preorder" className="text-white text-2xl font-display" onClick={toggleMenu}>
           Explorer nos trésors
          </Link>
          {/* <Link href="/preorder" className="text-white text-2xl font-display" onClick={toggleMenu}>
            Mes Réservations
          </Link>
          <button type="button" className="bg-primary text-white px-8 py-3 rounded-full font-medium text-lg">
            Réserver
          </button> */}
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-48 overflow-hidden bg-[#4ACCC8]">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Sky/Gradient */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-gradient-to-b from-[#56C5D0] to-[#88E2D8]"
          />

          {/* Clouds */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute top-20 left-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"
          />
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 2, delay: 0.7 }}
            className="absolute top-40 right-20 w-48 h-48 bg-white/10 rounded-full blur-3xl"
          />
          

          {/* Bottom Illustration Placeholder */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-5xl translate-y-10 md:translate-y-20 z-30"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
              alt="Station Balnéaire"
              className="w-full rounded-t-[2rem] md:rounded-t-[3rem] shadow-2xl border-2 md:border-4 border-white/20"
            />

            {/* AI Chat Input - Centered on Image */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl px-4 z-20">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="bg-white rounded-full p-1.5 md:p-2 shadow-2xl flex items-center gap-2 border-2 md:border-4 border-white/20"
              >
                <div className="pl-3 md:pl-6 text-primary">
                  <span className="material-icons-round text-xl md:text-3xl">auto_awesome</span>
                </div>
                <input
                  type="text"
                  className="flex-1 p-2 md:p-4 text-gray-900 font-medium text-sm md:text-lg border-none focus:ring-0 placeholder-gray-400 outline-none bg-transparent"
                  placeholder="Où souhaitez-vous aller ?"
                />
                
                <div className="flex items-center gap-1 md:gap-2">
                  <button type="button" className="p-2 text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-gray-50">
                    <span className="material-icons-round text-xl md:text-2xl">mic</span>
                  </button>
                  <button type="button" className="p-2 text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-gray-50">
                    <span className="material-icons-round text-xl md:text-2xl">add_photo_alternate</span>
                  </button>
                </div>

                <button type="button" className="bg-primary hover:bg-primary/90 text-white w-10 h-10 md:w-14 md:h-14 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center shrink-0">
                  <span className="material-icons-round text-lg md:text-2xl">arrow_upward</span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pointer-events-none">
          {/* Background Text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.1 }}
            className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/4 select-none pointer-events-none z-0"
          >
            <span className="font-display font-bold text-[8rem] md:text-[13rem] lg:text-[18rem] text-white/10 whitespace-nowrap leading-none">
              OKEYO
            </span>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative z-10 font-display text-5xl md:text-7xl lg:text-8xl text-white mb-8 leading-tight drop-shadow-md uppercase"
          >
            LAISSEZ PARLER
            <br />
            <span className="italic">VOTRE MOOD</span>
            <br />
            <span className="text-2xl md:text-4xl lg:text-5xl block mt-2 font-bold tracking-wider opacity-90">
              NOUS NOUS OCCUPONS DU RESTE.
            </span>
          </motion.h1>
          <div className="h-[2vh] md:h-[200px] lg:h-[320px]"></div>


          {/* AI Chat Input */}

        </div>
      </section>

      {/* Value Prop Section */}
      <section className="py-24 bg-background relative z-30 -mt-10 rounded-t-[3rem]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl text-foreground leading-snug">
              TROUVEZ LE <span className="text-primary italic">SÉJOUR PARFAIT</span>
              <br />
              AVEC LES MEILLEURES OFFRES, GARANTIES.
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-8">
              <button type="button" className="bg-foreground text-white px-8 py-3 rounded-full font-medium hover:bg-foreground/90 transition-colors">
                Explorer nos trésors
              </button>
              <button type="button" className="border border-gray-200 text-foreground px-8 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors">
               Nos offres du moment
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="group bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="material-icons-round text-blue-500 text-3xl">verified_user</span>
              </div>
              <h3 className="font-display font-bold text-xl text-gray-900 mb-3">Meilleur Prix Garanti</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Obtenez les meilleurs tarifs sur nos logements, activités.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="group bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="material-icons-round text-purple-500 text-3xl">smartphone</span>
              </div>
              <h3 className="font-display font-bold text-xl text-gray-900 mb-3">Réservation Simple & Sécurisée</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Réservations sans tracas avec paiement sécurisé.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="group bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-pink-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="material-icons-round text-primary text-3xl">local_offer</span>
              </div>
              <h3 className="font-display font-bold text-xl text-gray-900 mb-3">Offres & Réductions Exclusives</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Économisez plus avec nos offres spéciales.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="group bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="material-icons-round text-orange-500 text-3xl">support_agent</span>
              </div>
              <h3 className="font-display font-bold text-xl text-gray-900 mb-3">Assistance IA 24/7</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Nous sommes là pour vous aider à tout moment.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Rooms Section */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <h2 className="font-display text-5xl md:text-7xl text-foreground leading-[0.9]">
                DÉCOUVREZ<br />
                <span className="text-primary italic ml-12">NOS CHAMBRES</span><br />
                & SUITES
              </h2>

              <div className="mt-12 max-w-md">
                <p className="text-muted-foreground mb-8 text-lg">
                  Découvrez un monde de confort et de style avec nos chambres et suites.
                </p>
                <button type="button" className="bg-foreground text-white px-8 py-3 rounded-full font-medium hover:bg-foreground/90 transition-colors inline-flex items-center gap-2">
                  VOIR LES LOGEMENTS
                  <span className="material-icons-round text-sm">arrow_forward</span>
                </button>
              </div>

              {/* Decorative Image Card 1 */}
              <div className="absolute -bottom-20 -right-10 md:right-0 w-48 h-64 rounded-2xl overflow-hidden shadow-2xl rotate-6 hidden md:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  className="w-full h-full object-cover"
                  alt="Suite Zen"
                />
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <span className="text-white font-display text-lg">Suite Zen</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="space-y-4 mt-12">
                <div className="rounded-2xl overflow-hidden shadow-lg h-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                    alt="Chambre 1"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                    alt="Chambre 2"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden shadow-lg h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                    alt="Chambre 3"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg h-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                    alt="Chambre 4"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Agent Preview Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:w-1/2 relative z-10"
            >
              <span className="text-primary font-bold tracking-wider uppercase text-sm mb-2 block">
                Planification Intelligente
              </span>
              <h2 className="font-display text-4xl lg:text-5xl text-gray-900 mb-6 leading-tight uppercase">
                RENCONTREZ VOTRE NOUVEL <br />
                <span className="text-primary italic">ARCHITECTE DE VOYAGE</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Oubliez les recherches interminables. Dites à notre agent IA votre voyage de rêve, votre budget et votre style, et regardez-le créer l'itinéraire parfait instantanément.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                    <span className="material-icons-round text-green-500 text-2xl">chat</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Conversation Naturelle</h4>
                    <p className="text-gray-500 text-sm">Discutez comme avec un ami. Pas de formulaires complexes.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                    <span className="material-icons-round text-blue-500 text-2xl">bolt</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Itinéraires Instantanés</h4>
                    <p className="text-gray-500 text-sm">Obtenez des plans jour par jour en quelques secondes.</p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <button type="button" className="bg-gray-900 text-white px-8 py-4 rounded-full font-medium hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2">
                  Essayer Maintenant
                  <span className="material-icons-round text-sm">arrow_forward</span>
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50, rotate: 10 }}
              whileInView={{ opacity: 1, x: 0, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, type: "spring", bounce: 0.4 }}
              className="lg:w-1/2 w-full relative"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/10 to-purple-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
              
              {/* Mock Chat Interface */}
              <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-6 relative z-10 max-w-md mx-auto transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-400 rounded-full flex items-center justify-center text-white shadow-md">
                    <span className="material-icons-round">smart_toy</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Okeyo Agent</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-gray-500 font-medium">En ligne & Prêt</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="bg-gray-100 text-gray-800 px-5 py-3 rounded-2xl rounded-tr-sm text-sm font-medium max-w-[85%]">
                      Je veux un week-end romantique à Marrakech, moins de 500 MAD/nuit. 🥐��
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 text-gray-800 px-5 py-4 rounded-2xl rounded-tl-sm text-sm shadow-sm max-w-[90%]">
                      <p className="mb-3"><span className="font-bold text-primary">Okeyo:</span> Bonjour ! Voici 3 endroits magnifiques pour vous :</p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl">
                          <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img src="https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover" alt="Riad" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs truncate">Riad Yasmine</p>
                            <p className="text-[10px] text-gray-500">320 MAD/nuit • 4.9★</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl">
                          <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img src="https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover" alt="Palace" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs truncate">Palais Namaskar</p>
                            <p className="text-[10px] text-gray-500">450 MAD/nuit • 4.8★</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Demandez n'importe quoi..." 
                    className="w-full bg-gray-50 border-none rounded-full py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    readOnly
                  />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white shadow-sm">
                    <span className="material-icons-round text-sm">send</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-5xl md:text-7xl text-foreground/10 absolute left-0 right-0 mx-auto select-none pointer-events-none -mt-12">
            TÉMOIGNAGES
          </h2>
          <h2 className="font-display text-4xl md:text-5xl text-foreground relative z-10 mb-16">
            CE QUE DISENT
            <br />
            <span className="text-primary italic">NOS CLIENTS</span>
          </h2>

          <div className="max-w-4xl mx-auto relative">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-left h-[400px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTestimonial}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-primary text-6xl font-serif mb-4">"</div>
                    <p className="text-xl md:text-2xl text-foreground leading-relaxed font-medium mb-8">
                      {TESTIMONIALS[currentTestimonial].quote}
                    </p>
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={TESTIMONIALS[currentTestimonial].avatar}
                        className="w-12 h-12 rounded-full object-cover"
                        alt={TESTIMONIALS[currentTestimonial].author}
                      />
                      <div>
                        <h4 className="font-bold text-foreground">{TESTIMONIALS[currentTestimonial].author}</h4>
                        <p className="text-sm text-muted-foreground">{TESTIMONIALS[currentTestimonial].date}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="flex gap-4 mt-8">
                  <button
                    onClick={prevTestimonial}
                    type="button"
                    className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-colors"
                  >
                    <span className="material-icons-round">arrow_back</span>
                  </button>
                  <button
                    onClick={nextTestimonial}
                    type="button"
                    className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-colors"
                  >
                    <span className="material-icons-round">arrow_forward</span>
                  </button>
                </div>
              </div>

              <div className="relative h-[400px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`img-1-${currentTestimonial}`}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="absolute right-0 top-0 w-64 h-80 rounded-3xl overflow-hidden shadow-xl z-20"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={TESTIMONIALS[currentTestimonial].images[0]}
                      className="w-full h-full object-cover"
                      alt="Testimonial 1"
                    />
                  </motion.div>
                </AnimatePresence>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`img-2-${currentTestimonial}`}
                    initial={{ opacity: 0, scale: 0.9, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="absolute left-10 bottom-0 w-56 h-64 rounded-3xl overflow-hidden shadow-lg z-10 border-4 border-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={TESTIMONIALS[currentTestimonial].images[1]}
                      className="w-full h-full object-cover"
                      alt="Testimonial 2"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b1120] text-white pt-20 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start mb-16">
            <div className="mb-8 md:mb-0">
              <Link href="/preorder" className="flex items-center gap-2 mb-6">
                <span className="font-display font-bold text-4xl tracking-tight">
                  Okeyo<span className="font-normal italic">Travel</span>
                </span>
              </Link>
            </div>

            <div className="flex flex-wrap gap-12 md:gap-24">
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-6">
                  À propos
                </h4>
                <ul className="space-y-4 text-sm text-gray-300">
                  <li>
                    <Link href="/preorder" className="hover:text-primary transition-colors">
                      Notre Histoire
                    </Link>
                  </li>
                  <li>
                    <Link href="/preorder" className="hover:text-primary transition-colors">
                      Carrières
                    </Link>
                  </li>
                  <li>
                    <Link href="/preorder" className="hover:text-primary transition-colors">
                      Presse
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-6">
                  Aide
                </h4>
                <ul className="space-y-4 text-sm text-gray-300">
                  <li>
                    <Link href="/preorder" className="hover:text-primary transition-colors">
                      Contactez-nous
                    </Link>
                  </li>
                  <li>
                    <Link href="/preorder" className="hover:text-primary transition-colors">
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link href="/preorder" className="hover:text-primary transition-colors">
                      Conditions d'utilisation
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-6">
                  Réseaux
                </h4>
                <div className="flex gap-4">
                  <Link href="/preorder" className="text-gray-400 hover:text-white transition-colors">
                    IG
                  </Link>
                  <Link href="/preorder" className="text-gray-400 hover:text-white transition-colors">
                    TW
                  </Link>
                  <Link href="/preorder" className="text-gray-400 hover:text-white transition-colors">
                    FB
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <p>&copy; 2026 Okeyo Travel. Tous droits réservés.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="/preorder" className="hover:text-white transition-colors">
                Confidentialité
              </Link>
              <Link href="/preorder" className="hover:text-white transition-colors">
                Conditions
              </Link>
              <Link href="/preorder" className="hover:text-white transition-colors">
                Plan du site
              </Link>
            </div>
          </div>
        </motion.div>
      </footer>
    </div>
  )
}
