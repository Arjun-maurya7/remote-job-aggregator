import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import {
  decodeHTMLEntities,
  formatDate,
  formatSalary,
  getCompanyAvatarStyle,
} from '../utils/format';

/**
 * JobCard Component
 *
 * Premium dark glass job card with staggered entrance animation,
 * glossy top line, left accent border on hover, deterministic
 * avatar palettes, badge tags, and tactile action buttons.
 */
export function JobCard({ job, index = 0 }) {
  const [logoError, setLogoError] = useState(false);

  const decodedTitle = decodeHTMLEntities(job.title);
  const decodedCompany = decodeHTMLEntities(job.company);
  const decodedLocation = decodeHTMLEntities(job.location);
  const companyLogoUrl = job.company_logo || job.companyLogo;
  const companyInitial = decodedCompany ? decodedCompany.charAt(0).toUpperCase() : 'J';
  const avatarStyle = getCompanyAvatarStyle(decodedCompany);

  // Staggered entrance: each card delays by 60ms × its index, capped at 480ms
  const delay = Math.min(index * 60, 480);

  return (
    <article
      className="glass-job-card"
      style={{ '--card-delay': `${delay}ms` }}
    >
      {/* Top Card Row */}
      <div className="card-top-row">
        <div className="avatar-wrapper">
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
              style={{
                background: avatarStyle.bg,
                color: avatarStyle.color,
                borderColor: avatarStyle.border,
              }}
            >
              {companyInitial}
            </div>
          )}
        </div>

        <div className="card-title-block">
          <Link to={`/jobs/${job.id}`} className="card-job-title">
            {decodedTitle}
          </Link>
          <p className="card-company-name">{decodedCompany}</p>
        </div>
      </div>

      {/* Badges Row */}
      <div className="card-badges-row">
        {(job.employment_type || []).map((type, idx) => (
          <span key={`emp-${idx}`} className="pill-badge pill-indigo">
            {decodeHTMLEntities(type)}
          </span>
        ))}
        {(job.industry || []).map((ind, idx) => (
          <span key={`ind-${idx}`} className="pill-badge pill-slate">
            {decodeHTMLEntities(ind)}
          </span>
        ))}
        {job.job_level && (
          <span className="pill-badge pill-purple">
            {decodeHTMLEntities(job.job_level)}
          </span>
        )}
      </div>

      {/* Footer Meta & Actions */}
      <div className="card-footer-row">
        <div className="card-meta-left">
          {decodedLocation && (
            <div className="meta-pill">
              <MapPin className="w-3.5 h-3.5" />
              <span>{decodedLocation}</span>
            </div>
          )}
          <div className="meta-pill salary">
            <DollarSign className="w-3.5 h-3.5" />
            <span>{formatSalary(job)}</span>
          </div>
          <div className="meta-pill date">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(job.published_at)}</span>
          </div>
        </div>

        <div className="card-actions-right">
          <Link to={`/jobs/${job.id}`} className="btn-glass-secondary">
            <span>View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gradient-primary"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Apply for ${decodedTitle} at ${decodedCompany} (opens in new window)`}
          >
            <span>Apply ↗</span>
          </a>
        </div>
      </div>
    </article>
  );
}
