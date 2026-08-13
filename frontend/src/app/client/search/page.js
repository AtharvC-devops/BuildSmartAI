"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, DollarSign, Clock, Filter, X } from "lucide-react";
import { getServices } from "@/lib/api";

export default function CustomerSearch() {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    getServices().then(setServices).catch(console.error);
  }, []);

  const filtered = services.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !s.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && s.category !== category) return false;
    if (maxBudget && s.minBudget > parseInt(maxBudget)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Search Services</h2>
        <p className="text-sm text-slate-500">Find the perfect construction service for your needs</p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search services, e.g., 'residential', 'renovation'..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-all ${
              showFilters ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All Categories</option>
                <option value="construction">Construction</option>
                <option value="renovation">Renovation</option>
                <option value="design">Design</option>
                <option value="consultation">Consultation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Budget (₹)</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 5000000"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((service, i) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-6 flex flex-col"
          >
            <div className="text-3xl mb-3">{service.icon}</div>
            <h3 className="font-semibold text-slate-900 text-lg mb-1">{service.name}</h3>
            <p className="text-sm text-slate-500 mb-4 flex-1 leading-relaxed">{service.description}</p>

            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Budget Range</span>
                <span className="font-medium text-slate-700">₹{(service.minBudget / 100000).toFixed(0)}L – ₹{(service.maxBudget / 100000).toFixed(0)}L</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Duration</span>
                <span className="font-medium text-slate-700">{service.duration}</span>
              </div>
            </div>

            <span className="mt-4 inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-medium capitalize">
              {service.category}
            </span>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <SearchIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No services found</h3>
          <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
