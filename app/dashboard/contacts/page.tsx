"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, Filter, Download, Plus, 
  Mail, Phone, Loader2,
  Trash2, Edit2, Eye, Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

interface Contact {
  id: string
  nom: string
  contact: string
  note: string
  date: string
  source?: string
}

export default function ContactsPage() {
  const { dashboardData, token, isAuthenticated } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [exporting, setExporting] = useState(false)

  const contacts: Contact[] = dashboardData?.prospects || []

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.contact?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.note?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleSelectContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(filteredContacts.map((c) => c.id))
    }
  }

  const handleExport = async () => {
    if (!token) return
    setExporting(true)
    try {
      const result = await api.exportLeadsAsCSV(token)
      if (result.success && result.data) {
        // Create download link
        const blob = new Blob([result.data as string], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'contacts_mahu.csv'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Export error:", error)
    }
    setExporting(false)
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return "Aujourd'hui"
      if (diffDays === 1) return "Hier"
      if (diffDays < 7) return `Il y a ${diffDays} jours`
      if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`
      return date.toLocaleDateString('fr-FR')
    } catch {
      return dateStr
    }
  }

  const getContactType = (contact: string) => {
    if (contact.includes('@')) return 'email'
    if (contact.startsWith('+') || /^\d/.test(contact)) return 'phone'
    return 'other'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes Contacts</h1>
          <p className="text-muted-foreground">{contacts.length} contact{contacts.length > 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="border-border/50"
            onClick={handleExport}
            disabled={exporting || contacts.length === 0}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exporter CSV
          </Button>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un contact..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={`border-border/50 ${showFilters ? "bg-primary/10 border-primary/50" : ""}`}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtres
        </Button>
      </motion.div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm"
          >
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Periode</label>
                <select className="px-4 py-2 rounded-lg bg-muted/30 border border-border/50 text-foreground">
                  <option>Tout</option>
                  <option>7 derniers jours</option>
                  <option>30 derniers jours</option>
                  <option>Cette annee</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedContacts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-primary/10 border border-primary/30"
          >
            <span className="text-sm font-medium text-foreground">
              {selectedContacts.length} contact(s) selectionne(s)
            </span>
            <div className="flex-1" />
            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts Table/List */}
      {contacts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl bg-card/50 border border-border/50"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Aucun contact pour l&apos;instant</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Partagez votre carte de visite numerique pour commencer a collecter des contacts.
            Les personnes qui vous contactent apparaitront ici.
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded bg-muted/50 border-border/50"
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Contact</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">Message</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact, index) => {
                  const contactType = getContactType(contact.contact)
                  return (
                    <motion.tr
                      key={contact.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => toggleSelectContact(contact.id)}
                          className="w-4 h-4 rounded bg-muted/50 border-border/50"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-primary">
                              {getInitials(contact.nom)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{contact.nom}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              {contactType === 'email' ? (
                                <Mail className="w-3 h-3" />
                              ) : contactType === 'phone' ? (
                                <Phone className="w-3 h-3" />
                              ) : null}
                              <span className="truncate">{contact.contact}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <p className="text-foreground text-sm truncate max-w-xs" title={contact.note}>
                          {contact.note || "-"}
                        </p>
                      </td>
                      <td className="p-4 hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(contact.date)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {contactType === 'email' && (
                            <motion.a
                              href={`mailto:${contact.contact}`}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                              title="Envoyer un email"
                            >
                              <Mail className="w-4 h-4" />
                            </motion.a>
                          )}
                          {contactType === 'phone' && (
                            <motion.a
                              href={`tel:${contact.contact}`}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                              title="Appeler"
                            >
                              <Phone className="w-4 h-4" />
                            </motion.a>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredContacts.length === 0 && contacts.length > 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">Aucun contact trouve pour cette recherche</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
