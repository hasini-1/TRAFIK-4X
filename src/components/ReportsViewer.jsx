import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import CommandCard from './ui/CommandCard';
import CommandButton from './ui/CommandButton';
import StatusBadge from './ui/StatusBadge';
import { Download, Database } from 'lucide-react';
import { downloadEventReportPDF } from '../utils/pdfGenerator';

export default function ReportsViewer() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/reports/all`);
      setReports(res.data);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setError("Failed to access system-wide reports archive.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownloadReport = async (rep) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/events/${rep.event_id}`);
      const eventDetails = res.data;
      await downloadEventReportPDF(eventDetails);
    } catch (err) {
      console.error("Failed to load details for report PDF generation:", err);
      alert("Error generating report. Unable to contact event gateway.");
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Overview */}
      <CommandCard title="GENOME ARCHIVE REPOSITORY">
        <div className="flex justify-between items-center py-2">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              On-Demand Incident Audit Generation
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-xl">
              Select any verified incident report from the database listing below to trigger an immediate export of its full impact ratings, SLA metrics, matching history, and final resource directives.
            </p>
          </div>
          <Database className="w-10 h-10 text-cyber-accent opacity-80" />
        </div>
      </CommandCard>

      {/* Reports Listing Table */}
      <CommandCard title="CENTRALIZED REPORTS DIRECTORY">
        {error && (
          <div className="p-4 border border-cyber-red/20 bg-cyber-red/5 rounded-lg text-xs font-mono text-cyber-red">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-mono">
            Accessing database archive...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-mono">
            No reportable events found in the database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono text-slate-350">
              <thead>
                <tr className="border-b border-[#00d2ff]/15 text-slate-500 uppercase text-[9px] font-orbitron tracking-widest bg-[#080c1e]/40">
                  <th className="p-3">Report ID</th>
                  <th className="p-3">Event ID</th>
                  <th className="p-3">Creator</th>
                  <th className="p-3">Assignee</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">PDF Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-[#00d2ff]/5 transition-colors">
                    <td className="p-3 font-bold text-white">{rep.id}</td>
                    <td className="p-3 font-bold text-cyber-accent">{rep.event_id}</td>
                    <td className="p-3 font-sans capitalize">{rep.creator_name || 'System Operator'}</td>
                    <td className="p-3 font-sans capitalize">{rep.assignee_name || 'Unassigned'}</td>
                    <td className="p-3">
                      <StatusBadge status={rep.status} />
                    </td>
                    <td className="p-3 text-[10px] text-slate-400">
                      {new Date(rep.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <CommandButton
                        onClick={() => handleDownloadReport(rep)}
                        className="py-1 px-3 text-[9px] flex items-center gap-1.5 ml-auto"
                      >
                        <Download className="w-3 h-3" />
                        EXPORT REPORT
                      </CommandButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CommandCard>

    </div>
  );
}
