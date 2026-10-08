import React, { useState } from 'react';
import { KanbanSquare, Plus, Calendar, MapPin, ExternalLink, MoreVertical, Trash2 } from 'lucide-react';
import { useCareer } from '../context/CareerContext';
import API from '../services/api';

export default function ApplicationTrackerPage() {
  const { applications, setApplications } = useCareer();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newApp, setNewApp] = useState({ company: '', role: '', location: 'Bengaluru', status: 'Applied' });

  const columns = ['Saved', 'Applied', 'Interview', 'Offer'];

  const getAppsByStatus = (status) => {
    return applications.filter(a => a.status === status);
  };

  const handleUpdateStatus = (id, newStatus) => {
    API.patch(`/applications/${id}`, { status: newStatus }).then(res => {
      if (res.data && res.data.data) {
        setApplications(prev => prev.map(a => a._id === id ? res.data.data : a));
      }
    }).catch(()=>{
      // Optimistic local update
      setApplications(prev => prev.map(a => a._id === id ? { ...a, status: newStatus } : a));
    });
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    API.post('/applications', newApp).then(res => {
      if (res.data && res.data.data) {
        setApplications(prev => [res.data.data, ...prev]);
        setShowAddModal(false);
        setNewApp({ company: '', role: '', location: 'Bengaluru', status: 'Applied' });
      }
    }).catch(()=>{});
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Applications Tracker</h2>
          <p className="text-xs text-slate-500">Track your job applications and never miss an opportunity.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Application
        </button>
      </div>

      {/* Top Filter Stats Bar */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-3 text-xs overflow-x-auto">
        <span className="font-bold text-slate-700">Saved: <span className="text-slate-900">{getAppsByStatus('Saved').length}</span></span>
        <span className="font-bold text-slate-700">Applied: <span className="text-indigo-600">{getAppsByStatus('Applied').length}</span></span>
        <span className="font-bold text-slate-700">Interview: <span className="text-purple-600">{getAppsByStatus('Interview').length}</span></span>
        <span className="font-bold text-slate-700">Offer: <span className="text-emerald-600">{getAppsByStatus('Offer').length}</span></span>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {columns.map((col, idx) => {
          const colApps = getAppsByStatus(col);
          return (
            <div key={idx} className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200/80 space-y-3 min-h-[500px]">
              <div className="flex items-center justify-between font-bold text-xs text-slate-700">
                <span>{col}</span>
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px]">{colApps.length}</span>
              </div>

              <div className="space-y-3">
                {colApps.map((app, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition space-y-2 group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                          {app.company[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{app.company}</h4>
                          <p className="text-[10px] text-slate-500">{app.role}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {app.location || 'Bengaluru'}
                      </span>
                      {app.interviewDate && (
                        <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                          📅 {app.interviewDate}
                        </span>
                      )}
                    </div>

                    {/* Status Changer Select */}
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Move to:</span>
                      <select
                        value={app.status}
                        onChange={(e) => handleUpdateStatus(app._id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none"
                      >
                        <option value="Saved">Saved</option>
                        <option value="Applied">Applied</option>
                        <option value="Interview">Interview</option>
                        <option value="Offer">Offer</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Add New Application</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600">Company Name</label>
                <input 
                  required
                  type="text" 
                  value={newApp.company}
                  onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
                  placeholder="e.g. Microsoft" 
                  className="w-full p-2 border border-slate-300 rounded-lg mt-1"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600">Role Title</label>
                <input 
                  required
                  type="text" 
                  value={newApp.role}
                  onChange={(e) => setNewApp({ ...newApp, role: e.target.value })}
                  placeholder="e.g. Software Engineer Intern" 
                  className="w-full p-2 border border-slate-300 rounded-lg mt-1"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600">Status</label>
                <select 
                  value={newApp.status}
                  onChange={(e) => setNewApp({ ...newApp, status: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg mt-1"
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-100 rounded-lg font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">Save Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
