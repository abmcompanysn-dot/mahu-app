"use client"

import { motion } from "framer-motion"
import { 
  LayoutDashboard, 
  User, 
  Users, 
  Settings, 
  Eye, 
  MousePointer, 
  UserPlus,
  TrendingUp,
  Share2,
  QrCode,
  Link as LinkIcon,
  Bell,
  Search
} from "lucide-react"

export function DashboardPreview() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Un dashboard
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent"> puissant</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Gerez votre carte, suivez vos statistiques et connectez-vous avec vos contacts
          </p>
        </motion.div>
        
        {/* Computer Frame */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          {/* Monitor */}
          <div className="relative">
            {/* Screen bezel */}
            <div className="bg-gradient-to-b from-zinc-700 to-zinc-800 rounded-t-2xl p-3 pb-0">
              {/* Camera dot */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zinc-600" />
              
              {/* Screen */}
              <div className="bg-background rounded-t-lg overflow-hidden border border-border/50 shadow-2xl">
                {/* Browser chrome */}
                <div className="h-8 bg-muted/50 border-b border-border/50 flex items-center px-3 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="h-5 bg-muted rounded-md flex items-center px-3 max-w-md mx-auto">
                      <span className="text-[10px] text-muted-foreground">app.mahu.cards/dashboard</span>
                    </div>
                  </div>
                </div>
                
                {/* Dashboard content */}
                <div className="flex h-[400px] md:h-[500px]">
                  {/* Sidebar */}
                  <div className="w-16 md:w-56 bg-sidebar border-r border-sidebar-border flex flex-col">
                    {/* Logo */}
                    <div className="p-4 border-b border-sidebar-border">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                          <span className="text-white font-bold text-sm">M</span>
                        </div>
                        <span className="text-foreground font-semibold hidden md:block">Mahu</span>
                      </div>
                    </div>
                    
                    {/* Nav items */}
                    <div className="flex-1 p-3 space-y-1">
                      {[
                        { icon: LayoutDashboard, label: "Dashboard", active: true },
                        { icon: User, label: "Mon Profil", active: false },
                        { icon: Users, label: "Contacts", active: false },
                        { icon: Settings, label: "Parametres", active: false },
                      ].map((item, i) => (
                        <div 
                          key={i}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                            item.active 
                              ? 'bg-primary/10 text-primary' 
                              : 'text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-medium hidden md:block">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Main content */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="h-14 border-b border-border/50 flex items-center justify-between px-4 md:px-6">
                      <div>
                        <h1 className="text-sm md:text-lg font-semibold text-foreground">Bonjour, Sophie</h1>
                        <p className="text-xs text-muted-foreground hidden md:block">Bienvenue sur votre dashboard</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Search className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center relative">
                          <Bell className="w-4 h-4 text-muted-foreground" />
                          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">SM</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Dashboard grid */}
                    <div className="flex-1 p-4 md:p-6 overflow-auto">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                        {/* Stats cards */}
                        {[
                          { label: "Vues totales", value: "2,847", change: "+12%", icon: Eye, color: "text-blue-500" },
                          { label: "Clics", value: "1,234", change: "+8%", icon: MousePointer, color: "text-green-500" },
                          { label: "Contacts", value: "156", change: "+23%", icon: UserPlus, color: "text-purple-500" },
                          { label: "Conversion", value: "5.4%", change: "+2%", icon: TrendingUp, color: "text-orange-500" },
                        ].map((stat, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 * i }}
                            className="p-3 md:p-4 rounded-xl bg-card/50 border border-border/50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <stat.icon className={`w-4 h-4 ${stat.color}`} />
                              <span className="text-[10px] text-green-500 font-medium">{stat.change}</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold text-foreground">{stat.value}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</p>
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Bottom section */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Share options */}
                        <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                          <h3 className="text-sm font-semibold text-foreground mb-3">Partager ma carte</h3>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { icon: QrCode, label: "QR Code" },
                              { icon: LinkIcon, label: "Lien" },
                              { icon: Share2, label: "Partager" },
                            ].map((option, i) => (
                              <div 
                                key={i}
                                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                              >
                                <option.icon className="w-5 h-5 text-primary" />
                                <span className="text-[10px] text-muted-foreground">{option.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Recent activity */}
                        <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                          <h3 className="text-sm font-semibold text-foreground mb-3">Activite recente</h3>
                          <div className="space-y-2">
                            {[
                              { text: "Nouvelle vue de votre profil", time: "Il y a 5 min" },
                              { text: "Contact enregistre via NFC", time: "Il y a 23 min" },
                              { text: "Clic sur votre lien LinkedIn", time: "Il y a 1h" },
                            ].map((activity, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <div className="flex-1">
                                  <p className="text-xs text-foreground">{activity.text}</p>
                                  <p className="text-[10px] text-muted-foreground">{activity.time}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Monitor stand */}
            <div className="flex justify-center">
              <div className="w-24 h-4 bg-gradient-to-b from-zinc-700 to-zinc-800 rounded-b-lg" />
            </div>
            <div className="flex justify-center">
              <div className="w-40 h-2 bg-gradient-to-b from-zinc-600 to-zinc-700 rounded-b-xl" />
            </div>
          </div>
        </motion.div>
        
        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <a 
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Creer mon compte gratuitement
          </a>
        </motion.div>
      </div>
    </section>
  )
}
