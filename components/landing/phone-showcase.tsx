"use client"

import { motion } from "framer-motion"
import { MapPin, Briefcase, Linkedin, Mail, Phone, Globe, Instagram, Twitter } from "lucide-react"

interface ProfileData {
  name: string
  title: string
  company: string
  location: string
  image: string
  accentColor: string
  socialLinks: { type: string; label: string }[]
}

const profiles: ProfileData[] = [
  {
    name: "Sophie Martin",
    title: "Directrice Marketing",
    company: "TechVision",
    location: "Paris, France",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
    accentColor: "#007AFF",
    socialLinks: [
      { type: "linkedin", label: "LinkedIn" },
      { type: "email", label: "Email" },
      { type: "phone", label: "Telephone" },
      { type: "website", label: "Site web" },
    ]
  },
  {
    name: "Alexandre Dubois",
    title: "CEO & Fondateur",
    company: "StartupFlow",
    location: "Lyon, France",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    accentColor: "#10B981",
    socialLinks: [
      { type: "linkedin", label: "LinkedIn" },
      { type: "twitter", label: "Twitter" },
      { type: "email", label: "Email" },
      { type: "instagram", label: "Instagram" },
    ]
  },
  {
    name: "Marie Laurent",
    title: "Designer UX/UI",
    company: "Creative Studio",
    location: "Bordeaux, France",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    accentColor: "#8B5CF6",
    socialLinks: [
      { type: "instagram", label: "Instagram" },
      { type: "linkedin", label: "LinkedIn" },
      { type: "website", label: "Portfolio" },
      { type: "email", label: "Email" },
    ]
  }
]

const getSocialIcon = (type: string) => {
  switch (type) {
    case "linkedin": return <Linkedin className="w-4 h-4" />
    case "email": return <Mail className="w-4 h-4" />
    case "phone": return <Phone className="w-4 h-4" />
    case "website": return <Globe className="w-4 h-4" />
    case "instagram": return <Instagram className="w-4 h-4" />
    case "twitter": return <Twitter className="w-4 h-4" />
    default: return <Globe className="w-4 h-4" />
  }
}

function PhoneFrame({ profile, index }: { profile: ProfileData; index: number }) {
  const isCenter = index === 1
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateY: index === 0 ? 15 : index === 2 ? -15 : 0 }}
      whileInView={{ opacity: 1, y: 0, rotateY: index === 0 ? 10 : index === 2 ? -10 : 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: index * 0.2 }}
      className={`relative ${isCenter ? 'z-20 scale-110' : 'z-10 opacity-90'}`}
      style={{ 
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      {/* Phone Frame */}
      <div className={`relative ${isCenter ? 'w-[280px] h-[580px]' : 'w-[250px] h-[520px]'} bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[45px] p-[10px] shadow-2xl`}>
        {/* Screen bezel */}
        <div className="absolute inset-[10px] bg-black rounded-[35px] overflow-hidden">
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-30" />
          
          {/* Screen Content */}
          <div className="h-full bg-background overflow-hidden">
            {/* Cover Image */}
            <div 
              className="h-28 relative"
              style={{ 
                background: `linear-gradient(135deg, ${profile.accentColor}40, ${profile.accentColor}20)`,
                borderBottom: `3px solid ${profile.accentColor}`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
            </div>
            
            {/* Profile Content */}
            <div className="px-4 pb-4 -mt-12 relative z-10">
              {/* Avatar */}
              <div 
                className="w-20 h-20 rounded-full border-4 mx-auto overflow-hidden shadow-lg"
                style={{ borderColor: profile.accentColor }}
              >
                <img 
                  src={profile.image} 
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Info */}
              <div className="text-center mt-3">
                <h3 className="text-base font-bold text-foreground">{profile.name}</h3>
                <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Briefcase className="w-3 h-3" />
                  <span>{profile.title}</span>
                </div>
                <p className="text-xs font-medium mt-0.5" style={{ color: profile.accentColor }}>
                  {profile.company}
                </p>
                <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{profile.location}</span>
                </div>
              </div>
              
              {/* Social Links */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {profile.socialLinks.map((link, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/50 border border-border/50 text-xs"
                  >
                    <div 
                      className="p-1.5 rounded-lg"
                      style={{ backgroundColor: `${profile.accentColor}20`, color: profile.accentColor }}
                    >
                      {getSocialIcon(link.type)}
                    </div>
                    <span className="text-foreground font-medium truncate">{link.label}</span>
                  </div>
                ))}
              </div>
              
              {/* Save Contact Button */}
              <button 
                className="w-full mt-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-lg"
                style={{ backgroundColor: profile.accentColor }}
              >
                Enregistrer le contact
              </button>
            </div>
          </div>
        </div>
        
        {/* Phone shine effect */}
        <div className="absolute inset-0 rounded-[45px] bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none" />
      </div>
    </motion.div>
  )
}

export function PhoneShowcase() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Des profils qui font
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent"> impression</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Creez votre carte de visite numerique personnalisee et partagez-la en un tap NFC
          </p>
        </motion.div>
        
        {/* Phones Container */}
        <div 
          className="flex items-center justify-center gap-4 md:gap-8"
          style={{ perspective: '1500px' }}
        >
          {profiles.map((profile, index) => (
            <PhoneFrame key={index} profile={profile} index={index} />
          ))}
        </div>
        
        {/* Features badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-4 mt-12"
        >
          {["Personnalisable", "NFC & QR Code", "Analytics", "Multi-liens"].map((feature, i) => (
            <div 
              key={i}
              className="px-4 py-2 rounded-full bg-card/50 border border-border/50 text-sm text-muted-foreground backdrop-blur-sm"
            >
              {feature}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
