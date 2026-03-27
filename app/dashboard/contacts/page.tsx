"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, Filter, Download, Plus, 
  MoreHorizontal, Mail, Phone, Linkedin,
  Trash2, Edit2, Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"

const contacts = [
  {
    id: 1,
    name: "Marie Martin",
    email: "marie.martin@example.com",
    phone: "+33 6 12 34 56 78",
    company: "TechCorp",
    title: "Directrice Marketing",
    date: "Il y a 2 jours",
    source: "NFC",
  },
  {
    id: 2,
    name: "Pierre Durand",
    email: "pierre.durand@example.com",
    phone: "+33 6 98 76 54 32",
    company: "InnovateCo",
    title: "CEO",
    date: "Il y a 1 semaine",
    source: "QR Code",
  },
  {
    id: 3,
    name: "Sophie Bernard",
    email: "sophie.bernard@example.com",
    phone: "+33 6 11 22 33 44",
    company: "DigitalFirst",
    title: "CTO",
    date: "Il y a 2 semaines",
    source: "Lien",
  },
  {
    id: 4,
    name: "Lucas Petit",
    email: "lucas.petit@example.com",
    phone: "+33 6 55 66 77 88",
    company: "CloudNine",
    title: "Product Manager",
    date: "Il y a 3 semaines",
    source: "NFC",
  },
]

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContacts, setSelectedContacts] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleSelectContact = (id: number) => {
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
          <p className="text-muted-foreground">{contacts.length} contacts au total</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-border/50">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
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
                <label className="block text-sm font-medium text-muted-foreground mb-2">Source</label>
                <select className="px-4 py-2 rounded-lg bg-muted/30 border border-border/50 text-foreground">
                  <option>Tous</option>
                  <option>NFC</option>
                  <option>QR Code</option>
                  <option>Lien</option>
                </select>
              </div>
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
            <Button variant="outline" size="sm" className="border-border/50">
              <Mail className="w-4 h-4 mr-2" />
              Envoyer un email
            </Button>
            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts Table */}
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
                <th className="p-4 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">Entreprise</th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">Source</th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact, index) => (
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
                          {contact.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{contact.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <p className="text-foreground">{contact.company}</p>
                    <p className="text-sm text-muted-foreground">{contact.title}</p>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      contact.source === "NFC" 
                        ? "bg-primary/20 text-primary" 
                        : contact.source === "QR Code"
                        ? "bg-emerald-500/20 text-emerald-500"
                        : "bg-amber-500/20 text-amber-500"
                    }`}>
                      {contact.source}
                    </span>
                  </td>
                  <td className="p-4 hidden lg:table-cell text-sm text-muted-foreground">
                    {contact.date}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                        title="Voir"
                      >
                        <Eye className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
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
              ))}
            </tbody>
          </table>
        </div>

        {filteredContacts.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">Aucun contact trouve</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
