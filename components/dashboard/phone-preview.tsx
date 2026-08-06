"use client"

// v6 - Supports both Profile and UserProfile types
import { motion } from "framer-motion"
import { Linkedin, Mail, Phone, Globe, MapPin, Instagram, Twitter, Facebook, Youtube, Github, MessageCircle, Link as LinkIcon } from "lucide-react"

const socialIcons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  linkedin: Linkedin,
  email: Mail,
  phone: Phone,
  website: Globe,
  instagram: Instagram,
  twitter: Twitter,
  facebook: Facebook,
  youtube: Youtube,
  github: Github,
  whatsapp: MessageCircle,
  default: LinkIcon,
}

const socialColors: Record<string, string> = {
  linkedin: "#0077B5",
  email: "#EA4335",
  phone: "#25D366",
  website: "#007AFF",
  instagram: "#E4405F",
  twitter: "#1DA1F2",
  facebook: "#1877F2",
  youtube: "#FF0000",
  github: "#333333",
  whatsapp: "#25D366",
  default: "#6B7280",
}

interface SocialLink {
  type: string
  url: string
  label?: string
}

interface ProfileData {
  Nom_Complet?: string
  Profession?: string
  Compagnie?: string
  Location?: string
  URL_Photo?: string
  URL_Couverture?: string
  Couleur_Theme?: string
  Liens_Sociaux_JSON?: string
  // Legacy format support
  firstName?: string
  lastName?: string
  title?: string
  company?: string
  location?: string
  profilePicture?: string
  coverImage?: string
  socialLinks?: SocialLink[]
}

interface PhonePreviewProps {
  profile?: ProfileData | null
  profileUrl?: string
}

export function PhonePreview({ profile, profileUrl }: PhonePreviewProps) {
  // Support both AppScript format and legacy format - NO demo values
  const displayName = profile?.Nom_Complet || 
    (profile?.firstName && profile?.lastName ? `${profile.firstName} ${profile.lastName}` : "")
  
  const initials = displayName
    ? displayName
        .split(" ")
        .map(n => n[0])
        .filter(Boolean)
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"
  
  const title = profile?.Profession || profile?.title || ""
  const company = profile?.Compagnie || profile?.company || ""
  const location = profile?.Location || profile?.location || ""
  const username = profileUrl || ""
  const profilePicture = profile?.URL_Photo || profile?.profilePicture
  const coverImage = profile?.URL_Couverture || profile?.coverImage
  const accentColor = profile?.Couleur_Theme || "#007AFF"

  // Parse social links
  let socialLinks: SocialLink[] = []
  if (profile?.Liens_Sociaux_JSON) {
    try {
      socialLinks = JSON.parse(profile.Liens_Sociaux_JSON)
    } catch {
      socialLinks = []
    }
  } else if (profile?.socialLinks) {
    socialLinks = profile.socialLinks
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
      suppressHydrationWarning
    >
      {/* Phone Frame */}
      <div className="relative mx-auto w-full max-w-[280px]">
        {/* Outer frame with realistic iPhone styling */}
        <div className="relative bg-[#1c1c1e] rounded-[45px] p-3 shadow-2xl">
          {/* Inner bezel */}
          <div className="relative bg-[#000] rounded-[38px] overflow-hidden">
            {/* Dynamic Island */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-20" />
            
            {/* Screen content */}
            <div className="relative h-[520px] bg-background overflow-hidden">
              {/* Cover Image */}
              <div 
                className="relative h-32 bg-cover bg-center"
                style={{ 
                  backgroundImage: coverImage 
                    ? `url(${coverImage})` 
                    : `linear-gradient(135deg, ${accentColor}40, ${accentColor}15)`,
                }}
              >
                <div 
                  className="absolute inset-0"
                  style={{ background: `radial-gradient(circle at 50% 120%, ${accentColor}30, transparent 50%)` }}
                />
              </div>

              {/* Profile Section */}
              <div className="relative px-5 -mt-12">
                {/* Profile Picture */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="w-20 h-20 rounded-full border-4 border-background flex items-center justify-center mx-auto overflow-hidden"
                  style={{ 
                    backgroundColor: profilePicture ? 'transparent' : `${accentColor}20`,
                  }}
                >
                  {profilePicture ? (
                    <img src={profilePicture} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold" style={{ color: accentColor }}>{initials}</span>
                  )}
                </motion.div>

                {/* Name & Title */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center mt-3"
                >
                  <h3 className="text-lg font-bold text-foreground">{displayName}</h3>
                  <p className="text-sm text-muted-foreground">{title}</p>
                  <p className="text-xs mt-1" style={{ color: accentColor }}>{company}</p>
                </motion.div>

                {/* Location */}
                {location && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.55 }}
                    className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{location}</span>
                  </motion.div>
                )}
              </div>

              {/* Social Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="px-5 mt-5"
              >
                <div className="grid grid-cols-2 gap-2">
                  {(socialLinks.length > 0 ? socialLinks : [
                    { type: "linkedin", label: "LinkedIn", url: "#" },
                    { type: "email", label: "Email", url: "#" },
                    { type: "phone", label: "Telephone", url: "#" },
                    { type: "website", label: "Site web", url: "#" },
                  ]).slice(0, 4).map((link, index) => {
                    const IconComponent = socialIcons[link.type?.toLowerCase()] || socialIcons.default
                    const color = socialColors[link.type?.toLowerCase()] || socialColors.default
                    return (
                      <motion.button
                        key={link.type + index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/30 transition-all"
                      >
                        <IconComponent className="w-4 h-4" style={{ color }} />
                        <span className="text-xs font-medium text-foreground truncate">
                          {link.label || link.type}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>

              {/* Save Contact Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="px-5 mt-4"
              >
                <button 
                  className="w-full py-3 rounded-xl text-white font-medium text-sm transition-colors"
                  style={{ backgroundColor: accentColor }}
                >
                  Enregistrer le contact
                </button>
              </motion.div>

              {/* QR Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-muted/30 backdrop-blur-sm border-t border-border/50"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white p-1.5 flex items-center justify-center">
                    {/* QR Code Pattern - deterministic */}
                    <svg viewBox="0 0 21 21" className="w-full h-full">
                      <rect fill="white" width="21" height="21"/>
                      <path d="M0,0h7v7H0V0zm1,1v5h5v-5H1zm1,1h3v3H2V2zm10,0h7v7h-7V0zm1,1v5h5v-5h-5zm1,1h3v3h-3V2zM0,14h7v7H0v-7zm1,1v5h5v-5H1zm1,1h3v3H2v-3zm8-8h1v1H10V8zm2,0h1v1h-1V8zm2,0h2v1h-2V8zm3,0h1v3h-1V8zm-7,1h1v1h-1V9zm4,0h1v1h-1V9zm-4,1h1v1h-1v-1zm2,0h1v3h-1v-3zm4,0h1v1h-1v-1zm-6,1h1v1h-1v-1zm2,0h1v1h-1v-1zm6,0h1v1h-1v-1zM8,12h1v1H8v-1zm4,0h1v1h-1v-1zm-4,1h3v1H8v-1zm4,0h1v3h-1v-3zm4,0h2v1h-2v-1zm3,0h1v1h-1v-1zM8,14h1v1H8v-1zm2,0h2v1h-2v-1zm7,0h1v3h-1v-3zm2,0h1v1h-1v-1zM8,15h1v2H8v-2zm2,0h1v1h-1v-1zm2,0h1v1h-1v-1zm6,0h1v1h-1v-1zm-7,1h1v1h-1v-1zm2,0h1v1h-1v-1zm6,0h1v2h-1v-2zM9,17h1v1H9v-1zm2,0h3v1h-3v-1zm4,0h1v1h-1v-1zm-5,1h1v2h-1v-2zm2,0h1v1h-1v-1zm4,0h1v1h-1v-1zm-4,1h3v1h-3v-1zm5,0h2v1h-2v-1z" fill="black"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">Scanner pour sauvegarder</p>
                    <p className="text-xs text-muted-foreground">ai.mahu.cards/p/{username}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/20 rounded-full" />
          </div>
        </div>

        {/* Reflection effect */}
        <div 
          className="absolute -inset-4 rounded-[55px] -z-10 blur-xl opacity-30"
          style={{ background: `linear-gradient(to bottom, ${accentColor}20, transparent)` }}
        />
      </div>
    </motion.div>
  )
}
