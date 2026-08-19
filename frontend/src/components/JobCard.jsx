import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Building, Calendar, DollarSign, ExternalLink, ArrowRight } from 'lucide-react';
import { decodeHTMLEntities, formatDate, formatSalary, cleanExcerpt } from '../utils/format';

/**
 * JobCard Component
 *
 * Renders a professional, recruiter-ready job listing card.
 */
export function JobCard({ job }) {
  const [logoError, setLogoError] = useState(false);

  const decodedTitle = decodeHTMLEntities(job.title);
  const decodedCompany = decodeHTMLEntities(job.company);
  const decodedLocation = decodeHTMLEntities(job.location);
  const companyLogoUrl = job.company_logo || job.companyLogo;
  const companyInitial = decodedCompany ? decodedCompany.charAt(0).toUpperCase() : 'J';

  return (
    <article className="job-card">
      <div className="job-card-top">
        {/* Company Logo / Fallback Avatar */}
        <div className="company-logo-container">
          {companyLogoUrl && !logoError ? (
            <img
              src={companyLogoUrl}
              alt={`${decodedCompany} logo`}
              className="company-logo-img"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="company-logo-fallback">{companyInitial}</div>
          )}
        </div>

        {/* Title & Company */}
        <div className="job-card-title-area">
          <Link to={`/jobs/${job.id}`} className="job-card-title">
            {decodedTitle}
          </Link>
          <div className="job-card-company">
            <Building className="w-4 h-4 text-slate-400" />
            <span>{decodedCompany}</span>
          </div>
        </div>

        {/* Location Badge */}
        {decodedLocation && (
          <div className="job-card-location-badge">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span>{decodedLocation}</span>
          </div>
        )}
      </div>

      {/* Metadata Badges */}
      <div className="job-badges-row">
        {(job.employment_type || []).map((type, idx) => (
          <span key={idx} className="badge badge-indigo">
            {decodeHTMLEntities(type)}
          </span>
        ))}
        {(job.industry || []).map((ind, idx) => (
          <span key={idx} className="badge badge-slate">
            {decodeHTMLEntities(ind)}
          </span>
        ))}
        {job.job_level && (
          <span className="badge badge-purple">
            {decodeHTMLEntities(job.job_level)}
          </span>
        )}
      </div>

      {/* Excerpt Summary */}
      <p className="job-card-excerpt">{cleanExcerpt(job.excerpt)}</p>

      {/* Card Footer Meta & Actions */}
      <div className="job-card-footer">
        <div className="job-card-meta">
          <div className="meta-item salary">
            <DollarSign className="w-3.5 h-3.5" />
            <span>{formatSalary(job)}</span>
          </div>
          <div className="meta-item">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(job.published_at)}</span>
          </div>
        </div>

        <div className="job-card-actions">
          <Link to={`/jobs/${job.id}`} className="btn-secondary">
            <span>View Job</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Apply for ${decodedTitle} at ${decodedCompany} (opens in new tab)`}
          >
            <span>Apply ↗</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
