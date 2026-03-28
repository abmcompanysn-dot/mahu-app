"use client"

import { motion } from "framer-motion"
import { useState } from "react"
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
  Search,
  LogOut,
  Building2,
  Download,
  Mail,
  Phone,
  Linkedin,
  Twitter,
  Instagram,
  Globe,
  ChevronRight,
  Camera,
  Palette,
  MapPin,
  Briefcase,
  Check,
  Copy,
  ExternalLink
} from "lucide-react"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: User, label: "Mon Profil", id: "profile" },
  { icon: Users, label: "Contacts", id: "contacts" },
  { icon: Building2, label: "Entreprise", id: "enterprise" },
  { icon: Settings, label: "Parametres", id: "settings" },
]

const stats = [
  { label: "Vues totales", value: "2,847", change: "+12%", icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "Clics", value: "1,234", change: "+8%", icon: MousePointer, color: "text-green-500", bg: "bg-green-500/10" },
  { label: "Contacts", value: "156", change: "+23%", icon: UserPlus, color: "text-purple-500", bg: "bg-purple-500/10" },
  { label: "Conversion", value: "5.4%", change: "+2%", icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" },
]

const contacts = [
  { name: "Marie Laurent", email: "marie@startup.io", company: "TechStartup", date: "Aujourd'hui" },
  { name: "Thomas Bernard", email: "thomas@agency.com", company: "Digital Agency", date: "Hier" },
  { name: "Julie Martin", email: "julie@corp.fr", company: "BigCorp France", date: "Il y a 2j" },
  { name: "Pierre Durand", email: "pierre@invest.com", company: "Capital Invest", date: "Il y a 3j" },
  { name: "Claire Petit", email: "claire@design.co", company: "Design Studio", date: "Il y a 5j" },
]

const activities = [
  { text: "Nouvelle vue de votre profil", time: "Il y a 5 min", type: "view" },
  { text: "Contact enregistre via NFC", time: "Il y a 23 min", type: "contact" },
  { text: "Clic sur votre lien LinkedIn", time: "Il y a 1h", type: "click" },
  { text: "10 nouvelles vues cette semaine", time: "Il y a 2h", type: "stats" },
  { text: "Nouveau contact: Marie L.", time: "Il y a 3h", type: "contact" },
]

export function DashboardDemo() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [copiedLink, setCopiedLink] = useState(false)

  const handleCopyLink = () => {
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <section className="py-24 relative overflow-hidden bg-muted/30">
      <div className="container mx-auto px-4 relative z-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Decouvrez le
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent"> Dashboard</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Une interface complete pour gerer votre carte de visite numerique, suivre vos statistiques et connecter avec vos contacts
          </p>
        </motion.div>
        
        {/* Computer Frame */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto"
        >
          {/* Monitor */}
          <div className="relative">
            {/* Screen bezel */}
            <div className="bg-gradient-to-b from-zinc-700 to-zinc-800 rounded-t-3xl p-4 pb-0 shadow-2xl">
              {/* Camera dot */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-zinc-600 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              </div>
              
              {/* Screen */}
              <div className="bg-background rounded-t-xl overflow-hidden border border-border/50">
                {/* Browser chrome */}
                <div className="h-10 bg-muted/50 border-b border-border/50 flex items-center px-4 gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors cursor-pointer" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors cursor-pointer" />
                    <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors cursor-pointer" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="h-6 bg-muted rounded-lg flex items-center px-3 max-w-lg mx-auto gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                      <span className="text-xs text-muted-foreground">app.mahu.cards/dashboard</span>
                    </div>
                  </div>
                </div>
                
                {/* Dashboard content - scrollable */}
                <div className="flex h-[500px] md:h-[600px]">
                  {/* Sidebar */}
                  <div className="w-16 md:w-64 bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0">
                    {/* Logo */}
                    <div className="p-4 border-b border-sidebar-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
                          <span className="text-white font-bold text-lg">M</span>
                        </div>
                        <span className="text-foreground font-bold text-xl hidden md:block">Mahu</span>
                      </div>
                    </div>
                    
                    {/* Nav items */}
                    <div className="flex-1 p-3 space-y-1">
                      {navItems.map((item) => (
                        <button 
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                            activeTab === item.id 
                              ? 'bg-primary/10 text-primary shadow-sm' 
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                          }`}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-medium hidden md:block">{item.label}</span>
                          {activeTab === item.id && (
                            <ChevronRight className="w-4 h-4 ml-auto hidden md:block" />
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {/* Logout */}
                    <div className="p-3 border-t border-sidebar-border">
                      <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium hidden md:block">Deconnexion</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Main content */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="h-16 border-b border-border/50 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
                      <div>
                        <h1 className="text-base md:text-xl font-bold text-foreground">
                          {activeTab === "dashboard" && "Bonjour, Sophie"}
                          {activeTab === "profile" && "Mon Profil"}
                          {activeTab === "contacts" && "Mes Contacts"}
                          {activeTab === "enterprise" && "Entreprise"}
                          {activeTab === "settings" && "Parametres"}
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                          {activeTab === "dashboard" && "Bienvenue sur votre dashboard Mahu"}
                          {activeTab === "profile" && "Personnalisez votre carte de visite"}
                          {activeTab === "contacts" && "Gerez vos contacts et prospects"}
                          {activeTab === "enterprise" && "Gerez votre equipe"}
                          {activeTab === "settings" && "Configurez votre compte"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <button className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                          <Search className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center relative hover:bg-muted transition-colors">
                          <Bell className="w-4 h-4 text-muted-foreground" />
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-white flex items-center justify-center font-medium">3</div>
                        </button>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center cursor-pointer">
                          <span className="text-xs font-bold text-white">SM</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                      {/* Dashboard Tab */}
                      {activeTab === "dashboard" && (
                        <div className="space-y-6">
                          {/* Stats grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            {stats.map((stat, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 * i }}
                                className="p-4 md:p-5 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                  </div>
                                  <span className="text-xs text-green-500 font-semibold bg-green-500/10 px-2 py-1 rounded-full">{stat.change}</span>
                                </div>
                                <p className="text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors">{stat.value}</p>
                                <p className="text-xs md:text-sm text-muted-foreground mt-1">{stat.label}</p>
                              </motion.div>
                            ))}
                          </div>
                          
                          {/* Share + Activity */}
                          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
                            {/* Share options */}
                            <div className="p-5 md:p-6 rounded-2xl bg-card/50 border border-border/50">
                              <h3 className="text-base md:text-lg font-semibold text-foreground mb-4">Partager ma carte</h3>
                              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 mb-4">
                                <span className="text-xs md:text-sm text-muted-foreground flex-1 truncate">mahu.cards/sophie-martin</span>
                                <button 
                                  onClick={handleCopyLink}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                                >
                                  {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  {copiedLink ? "Copie!" : "Copier"}
                                </button>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                {[
                                  { icon: QrCode, label: "QR Code", color: "text-blue-500" },
                                  { icon: LinkIcon, label: "Lien", color: "text-green-500" },
                                  { icon: Share2, label: "Partager", color: "text-purple-500" },
                                ].map((option, i) => (
                                  <button 
                                    key={i}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer group"
                                  >
                                    <div className={`w-10 h-10 rounded-xl bg-background flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                      <option.icon className={`w-5 h-5 ${option.color}`} />
                                    </div>
                                    <span className="text-xs text-muted-foreground font-medium">{option.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {/* Recent activity */}
                            <div className="p-5 md:p-6 rounded-2xl bg-card/50 border border-border/50">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base md:text-lg font-semibold text-foreground">Activite recente</h3>
                                <button className="text-xs text-primary hover:underline">Voir tout</button>
                              </div>
                              <div className="space-y-3">
                                {activities.slice(0, 4).map((activity, i) => (
                                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      activity.type === 'view' ? 'bg-blue-500/10' :
                                      activity.type === 'contact' ? 'bg-green-500/10' :
                                      activity.type === 'click' ? 'bg-purple-500/10' : 'bg-orange-500/10'
                                    }`}>
                                      {activity.type === 'view' && <Eye className="w-4 h-4 text-blue-500" />}
                                      {activity.type === 'contact' && <UserPlus className="w-4 h-4 text-green-500" />}
                                      {activity.type === 'click' && <MousePointer className="w-4 h-4 text-purple-500" />}
                                      {activity.type === 'stats' && <TrendingUp className="w-4 h-4 text-orange-500" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-foreground truncate">{activity.text}</p>
                                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Profile Tab */}
                      {activeTab === "profile" && (
                        <div className="space-y-6">
                          {/* Cover + Photo */}
                          <div className="relative rounded-2xl overflow-hidden">
                            <div className="h-32 md:h-40 bg-gradient-to-r from-primary via-blue-600 to-primary" />
                            <div className="absolute bottom-0 left-6 translate-y-1/2">
                              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary to-blue-600 border-4 border-background flex items-center justify-center">
                                <span className="text-2xl md:text-3xl font-bold text-white">SM</span>
                              </div>
                            </div>
                            <button className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1.5 hover:bg-white/30 transition-colors">
                              <Camera className="w-3 h-3" />
                              Modifier
                            </button>
                          </div>
                          
                          {/* Profile form */}
                          <div className="pt-10 md:pt-12 grid md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground font-medium">Nom complet</label>
                              <div className="h-10 px-4 rounded-xl bg-muted/30 border border-border/50 flex items-center text-sm">Sophie Martin</div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground font-medium">Profession</label>
                              <div className="h-10 px-4 rounded-xl bg-muted/30 border border-border/50 flex items-center text-sm">CEO & Fondatrice</div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground font-medium">Entreprise</label>
                              <div className="h-10 px-4 rounded-xl bg-muted/30 border border-border/50 flex items-center text-sm">TechStartup</div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground font-medium">Localisation</label>
                              <div className="h-10 px-4 rounded-xl bg-muted/30 border border-border/50 flex items-center text-sm gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                Paris, France
                              </div>
                            </div>
                          </div>
                          
                          {/* Social links */}
                          <div className="p-5 rounded-2xl bg-card/50 border border-border/50">
                            <h3 className="text-sm font-semibold text-foreground mb-4">Liens sociaux</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                { icon: Linkedin, label: "LinkedIn", color: "text-blue-600" },
                                { icon: Twitter, label: "Twitter", color: "text-sky-500" },
                                { icon: Instagram, label: "Instagram", color: "text-pink-500" },
                                { icon: Globe, label: "Site web", color: "text-green-500" },
                              ].map((social, i) => (
                                <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/30">
                                  <social.icon className={`w-4 h-4 ${social.color}`} />
                                  <span className="text-xs text-muted-foreground">{social.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Contacts Tab */}
                      {activeTab === "contacts" && (
                        <div className="space-y-4">
                          {/* Search + Filter */}
                          <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 h-10 px-4 rounded-xl bg-muted/30 border border-border/50 flex items-center gap-2">
                              <Search className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Rechercher un contact...</span>
                            </div>
                            <button className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-medium flex items-center justify-center gap-2">
                              <Download className="w-4 h-4" />
                              Exporter
                            </button>
                          </div>
                          
                          {/* Contacts list */}
                          <div className="rounded-2xl border border-border/50 overflow-hidden">
                            <div className="bg-muted/30 px-4 py-3 border-b border-border/50">
                              <div className="grid grid-cols-12 gap-4 text-xs text-muted-foreground font-medium">
                                <div className="col-span-4">Nom</div>
                                <div className="col-span-4 hidden md:block">Email</div>
                                <div className="col-span-3 hidden md:block">Entreprise</div>
                                <div className="col-span-8 md:col-span-1">Date</div>
                              </div>
                            </div>
                            {contacts.map((contact, i) => (
                              <div key={i} className="px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                                <div className="grid grid-cols-12 gap-4 items-center">
                                  <div className="col-span-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-semibold text-primary">
                                        {contact.name.split(' ').map(n => n[0]).join('')}
                                      </span>
                                    </div>
                                    <span className="text-sm font-medium text-foreground truncate">{contact.name}</span>
                                  </div>
                                  <div className="col-span-4 hidden md:block">
                                    <span className="text-sm text-muted-foreground truncate">{contact.email}</span>
                                  </div>
                                  <div className="col-span-3 hidden md:block">
                                    <span className="text-sm text-muted-foreground">{contact.company}</span>
                                  </div>
                                  <div className="col-span-8 md:col-span-1">
                                    <span className="text-xs text-muted-foreground">{contact.date}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Enterprise Tab */}
                      {activeTab === "enterprise" && (
                        <div className="space-y-6">
                          <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 to-blue-600/10 border border-primary/20">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-foreground">TechStartup</h3>
                                <p className="text-sm text-muted-foreground">Plan Entreprise - 10 membres</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center p-3 rounded-xl bg-background/50">
                                <p className="text-2xl font-bold text-foreground">10</p>
                                <p className="text-xs text-muted-foreground">Membres</p>
                              </div>
                              <div className="text-center p-3 rounded-xl bg-background/50">
                                <p className="text-2xl font-bold text-foreground">8,432</p>
                                <p className="text-xs text-muted-foreground">Vues totales</p>
                              </div>
                              <div className="text-center p-3 rounded-xl bg-background/50">
                                <p className="text-2xl font-bold text-foreground">342</p>
                                <p className="text-xs text-muted-foreground">Contacts</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Settings Tab */}
                      {activeTab === "settings" && (
                        <div className="space-y-4">
                          {[
                            { label: "Notifications par email", description: "Recevoir les alertes par email", enabled: true },
                            { label: "Notifications push", description: "Recevoir les notifications en temps reel", enabled: true },
                            { label: "Mode sombre", description: "Activer le theme sombre", enabled: true },
                            { label: "Profil public", description: "Rendre votre profil visible publiquement", enabled: true },
                          ].map((setting, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50">
                              <div>
                                <p className="text-sm font-medium text-foreground">{setting.label}</p>
                                <p className="text-xs text-muted-foreground">{setting.description}</p>
                              </div>
                              <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${setting.enabled ? 'bg-primary' : 'bg-muted'}`}>
                                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${setting.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Monitor stand */}
            <div className="flex justify-center">
              <div className="w-32 h-6 bg-gradient-to-b from-zinc-700 to-zinc-800 rounded-b-lg" />
            </div>
            <div className="flex justify-center">
              <div className="w-48 h-3 bg-gradient-to-b from-zinc-600 to-zinc-700 rounded-b-xl shadow-lg" />
            </div>
          </div>
        </motion.div>
        
        {/* Instruction */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          Cliquez sur les onglets de la sidebar pour explorer le dashboard
        </motion.p>
        
        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <a 
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-primary to-blue-600 text-white font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/30 text-lg"
          >
            Commencer gratuitement
            <ExternalLink className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
