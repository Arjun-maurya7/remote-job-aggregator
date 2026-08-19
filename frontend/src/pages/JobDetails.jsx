import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  ExternalLink,
  Briefcase,
  Layers,
  Building2,
  Clock,
  ServerOff,
} from 'lucide-react';

import { getJobById } from '../services/api';
import { Loading } from '../components/Loading';
import {
  decodeHTMLEntities,
  formatDate,
  formatSalary,
  getCompanyAvatarStyle,
} from '../utils/format';

/**
 * JobDetails Component
 *
 * Premium glass view displaying full details of a single job listing.
 * Maintains DOMPurify sanitization of HTML descriptions.
 */
export function JobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    async function loadJob() {
      setLoading(true);
      setError(null);

      try {
        const data = await getJobById(id);
        setJob(data);
      } catch (err) {
        setError(err.message || 'Job not found');
      } finally {
        setLoading(false);
      }
    }

    loadJob();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  if (loading) {
    return (
      <div className="app-shell">
        <main className="main-content-layout" style={{ maxWidth: '900px', paddingTop: '48px' }}>
          <Loading />
        </main>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="app-shell">
        <main className="main-content-layout" style={{ maxWidth: '800px', paddingTop: '48px' }}>
          <Link to="/" className="btn-back-link" style={{ display: 'inline-flex', marginBottom: '24px' }}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to opportunities</span>
          </Link>
          <div className="state-card-wrapper">
            <div className="glass-state-card error">
              <div className="state-icon-box error">
                <ServerOff className="w-6 h-6" />
              </div>
              <h3 className="state-card-title">Job Not Found</h3>
              <p className="state-card-message">{error}</p>
              <Link to="/" className="btn-gradient-primary">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const decodedTitle = decodeHTMLEntities(job.title);
  const decodedCompany = decodeHTMLEntities(job.company);
  const decodedLocation = decodeHTMLEntities(job.location);
  const companyLogoUrl = job.company_logo || job.companyLogo;
  const companyInitial = decodedCompany ? decodedCompany.charAt(0).toUpperCase() : 'J';
  const avatarStyle = getCompanyAvatarStyle(decodedCompany);

  // DOMPurify Sanitization of raw Jobicy description
  const sanitizedHTML = DOMPurify.sanitize(job.description || '<p>No description provided.</p>');

  return (
    <div className="app-shell">
      {/* Top Header Bar */}
      <header className="details-nav-bar">
        <div className="details-nav-inner">
          <Link to="/" className="btn-back-link">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to all opportunities</span>
          </Link>
        </div>
      </header>

      <main className="main-content-layout" style={{ paddingTop: '24px' }}>
        <div className="details-columns-grid">
          {/* Main Content Column */}
          <div className="details-main-column">
            {/* Header Hero Card */}
            <div className="glass-details-hero">
              <div className="details-brand-row">
                <div className="avatar-wrapper" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
                  {companyLogoUrl && !logoError ? (
                    <img
                      src={companyLogoUrl}
                      alt={`${decodedCompany} logo`}
                      className="avatar-image"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div
                      className="avatar-fallback"
                      style={{ fontSize: '20px', fontWeight: 800,
                        background: avatarStyle.bg,
                        color: avatarStyle.color,
                        borderColor: avatarStyle.border,
                      }}
                    >
                      {companyInitial}
                    </div>
                  )}
                </div>

                <div className="details-title-group">
                  <span className="pill-badge pill-indigo" style={{ marginBottom: '6px', display: 'inline-block' }}>
                    Jobicy Listing #{job.source_job_id}
                  </span>
                  <h1 className="details-heading">{decodedTitle}</h1>
                  <p className="details-subcompany">
                    {decodedCompany}
                    {decodedLocation ? <span style={{ color: 'var(--text-muted)' }}> • {decodedLocation}</span> : ''}
                  </p>
                </div>
              </div>

              <div className="details-meta-row">
                <div className="meta-pill">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Published: {formatDate(job.published_at)}</span>
                </div>
                <div className="meta-pill">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Ingested: {formatDate(job.fetched_at)}</span>
                </div>
              </div>
            </div>

            {/* Description Section Card */}
            <div className="glass-details-body">
              <h2 className="details-section-heading">Job Description</h2>
              <div
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
              />
            </div>
          </div>

          {/* Sticky Sidebar Column */}
          <aside className="details-sidebar-column">
            <div className="glass-sidebar-card">
              <h3 className="sidebar-card-heading">Job Overview</h3>

              <div className="sidebar-meta-stack">
                <div className="sidebar-item-row">
                  <div className="sidebar-icon-box">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="sidebar-item-label">Salary Range</span>
                    <span className="sidebar-item-val" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatSalary(job)}
                    </span>
                  </div>
                </div>

                <div className="sidebar-item-row">
                  <div className="sidebar-icon-box">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="sidebar-item-label">Location</span>
                    <span className="sidebar-item-val">{decodedLocation || 'Remote'}</span>
                  </div>
                </div>

                <div className="sidebar-item-row">
                  <div className="sidebar-icon-box">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="sidebar-item-label">Employment Type</span>
                    <span className="sidebar-item-val">
                      {(job.employment_type || []).map(decodeHTMLEntities).join(', ') || 'Full-Time'}
                    </span>
                  </div>
                </div>

                <div className="sidebar-item-row">
                  <div className="sidebar-icon-box">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="sidebar-item-label">Industry</span>
                    <span className="sidebar-item-val">
                      {(job.industry || []).map(decodeHTMLEntities).join(', ') || 'General'}
                    </span>
                  </div>
                </div>

                <div className="sidebar-item-row">
                  <div className="sidebar-icon-box">
                    <Layers className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="sidebar-item-label">Experience Level</span>
                    <span className="sidebar-item-val">
                      {decodeHTMLEntities(job.job_level) || 'All Levels'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="sidebar-cta-wrapper">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gradient-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: '14px', fontWeight: 700 }}
                  aria-label={`Apply for ${decodedTitle} on original Jobicy listing`}
                >
                  <span>Apply / View Job ↗</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
