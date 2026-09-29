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
  rating?: number
  date: string
  source?: string
  statut?: string
}

type ContactStatus = "nouveau" | "a_rappeler" | "ignore"

// Tri des contacts recus : qui rappeler, qui ignorer (utile surtout en mode
// confidentiel, ou l'on choisit a qui repondre).
const STATUS_LABELS: Record<ContactStatus, string> = {
  nouveau: "Nouveau",
  a_rappeler: "A rappeler",
  ignore: "Ignore",
}

export default function ContactsPage() {
  const { dashboardData, token, isAuthenticated, fetchDashboardData } = useAuth()
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
  const [statusFilter, setStatusFilter] = useState<"all" | ContactStatus>("all")
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ContactStatus>>({})
  const [statusError, setStatusError] = useState("")
  const [period, setPeriod] = useState<"all" | "7" | "30" | "year">("all")
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  const inPeriod = (c: Contact) => {
    if (period === "all") return true
    const d = new Date(c.date)
    const now = new Date()
    if (period === "year") return d.getFullYear() === now.getFullYear()
    return now.getTime() - d.getTime() <= Number(period) * 24 * 60 * 60 * 1000
  }

  const deleteContacts = async (ids: string[]) => {
    if (!token || ids.length === 0) return
    if (!confirm(ids.length > 1 ? `Supprimer ces ${ids.length} contacts ?` : "Supprimer ce contact ?")) return
    setDeleting(true)
    setStatusError("")
    const res = await api.deleteProspects(token, ids).catch(() => null)
    if (res?.success) {
      setRemovedIds((prev) => [...prev, ...ids])
      setSelectedContacts((prev) => prev.filter((id) => !ids.includes(id)))
      fetchDashboardData()
    } else {
      setStatusError("La suppression a echoue, reessayez.")
    }
    setDeleting(false)
  }

  const statusOf = (c: Contact): ContactStatus =>
    statusOverrides[c.id] || (c.statut as ContactStatus) || "nouveau"

  const setContactStatus = async (c: Contact, statut: ContactStatus) => {
    if (!token) return
    const previous = statusOf(c)
    setStatusOverrides((prev) => ({ ...prev, [c.id]: statut }))
    setStatusError("")
    const res = await api.updateProspectStatus(token, c.id, statut).catch(() => null)
    if (!res?.success) {
      setStatusOverrides((prev) => ({ ...prev, [c.id]: previous }))
      setStatusError("Le statut n'a pas pu etre enregistre.")
    }
  }

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
      !removedIds.includes(contact.id) &&
      inPeriod(contact) &&
      (statusFilter === "all" || statusOf(contact) === statusFilter) &&
      (contact.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.contact?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.note?.toLowerCase().includes(searchQuery.toLowerCase()))
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
      const csv = await api.exportLeadsAsCSV(token)
      {
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'contacts_mahu.csv'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      setStatusError("L'export CSV a echoue, reessayez.")
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

      {/* Status filter */}
      {contacts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(["all", "nouveau", "a_rappeler", "ignore"] as const).map((key) => {
            const count = key === "all" ? contacts.length : contacts.filter((c) => statusOf(c) === key).length
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  statusFilter === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {key === "all" ? "Tous" : STATUS_LABELS[key]} ({count})
              </button>
            )
          })}
          {statusError && <span className="text-sm text-destructive self-center">{statusError}</span>}
        </div>
      )}

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
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as typeof period)}
                  className="px-4 py-2 rounded-lg bg-muted/30 border border-border/50 text-foreground"
                >
                  <option value="all">Tout</option>
                  <option value="7">7 derniers jours</option>
                  <option value="30">30 derniers jours</option>
                  <option value="year">Cette annee</option>
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
            <Button
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => deleteContacts(selectedContacts)}
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
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
                          {contact.rating ? (
                            <span className="text-amber-500 mr-1" aria-label={`${contact.rating} sur 5`}>
                              {"★".repeat(contact.rating)}
                            </span>
                          ) : null}
                          {contact.note || (contact.rating ? "" : "-")}
                        </p>
                      </td>
                      <td className="p-4 hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(contact.date)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={statusOf(contact)}
                            onChange={(e) => setContactStatus(contact, e.target.value as ContactStatus)}
                            aria-label="Statut du contact"
                            className="px-2 py-1.5 rounded-lg bg-muted/30 border border-border/50 text-sm text-foreground"
                          >
                            {(Object.keys(STATUS_LABELS) as ContactStatus[]).map((k) => (
                              <option key={k} value={k}>
                                {STATUS_LABELS[k]}
                              </option>
                            ))}
                          </select>
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
                            onClick={() => deleteContacts([contact.id])}
                            disabled={deleting}
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
