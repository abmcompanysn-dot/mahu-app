"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Filter, Download, Plus,
  Mail, Phone, Loader2, Send, X,
  Trash2, Edit2, Eye, Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"
import { gmailApi } from "@/lib/connectors-api"

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
  const [gmailConnected, setGmailConnected] = useState(false)
  const [composeFor, setComposeFor] = useState<Contact | null>(null)
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const contacts: Contact[] = dashboardData?.prospects || []

  useEffect(() => {
    if (!token) return
    gmailApi.getStatus(token).then((status) => setGmailConnected(status.connected)).catch(() => {})
  }, [token])

  const openCompose = (contact: Contact) => {
    setComposeFor(contact)
    setComposeSubject("")
    setComposeBody(`Bonjour ${contact.nom},\n\n`)
    setSendError(null)
  }

  const handleSendEmail = async () => {
    if (!token || !composeFor || !composeSubject.trim() || !composeBody.trim()) return
    setSendingEmail(true)
    setSendError(null)
    try {
      await gmailApi.sendEmail(token, composeFor.contact, composeSubject, composeBody)
      setComposeFor(null)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erreur d'envoi")
    } finally {
      setSendingEmail(false)
    }
  }

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

  const getContactType = (contact: string | undefined | null) => {
    if (!contact || typeof contact !== 'string') return 'other'
    if (contact.includes('@')) return 'email'
    if (contact.startsWith('+') || /^\d/.test(contact)) return 'phone'
    return 'other'
  }

  const getInitials = (name: string | undefined | null) => {
    if (!name || typeof name !== 'string') return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
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
                          {contactType === 'email' && gmailConnected && (
                            <motion.button
                              onClick={() => openCompose(contact)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              title="Envoyer via Gmail"
                            >
                              <Send className="w-4 h-4" />
                            </motion.button>
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

      {/* Compose Gmail */}
      <AnimatePresence>
        {composeFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setComposeFor(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-card border border-border/50 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Envoyer via Gmail</h3>
                  <p className="text-sm text-muted-foreground">A : {composeFor.contact}</p>
                </div>
                <button onClick={() => setComposeFor(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Objet"
                className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50"
              />
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground resize-none focus:outline-none focus:border-primary/50"
              />
              {sendError && <p className="text-sm text-destructive">{sendError}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setComposeFor(null)} className="border-border/50">
                  Annuler
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !composeSubject.trim() || !composeBody.trim()}
                >
                  {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Envoyer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
