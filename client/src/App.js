/**
 * PR Approval Finder
 * Copyright (c) 2025 Aswin
 * Licensed under MIT License
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import FeedbackForm from './FeedbackForm';
import { APP_VERSION_SHORT } from './version';

function App() {
  const [prUrl, setPrUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [viewMode, setViewMode] = useState('basic'); // 'basic' or 'advanced'
  const [showHistory, setShowHistory] = useState(false);
  const [recentPRs, setRecentPRs] = useState([]);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackPrefillData, setFeedbackPrefillData] = useState({});
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showCloudflareModal, setShowCloudflareModal] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [showApprovalsInfoModal, setShowApprovalsInfoModal] = useState(false);
  const [mlPredictions, setMlPredictions] = useState(null);
  const [generalPredictions, setGeneralPredictions] = useState(null);
  const [mlModelStats, setMlModelStats] = useState(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  // Debug: Show current state
  // console.log('🔄 App render - Current state:', {
  //   hasResult: !!result,
  //   hasMLPredictions: !!mlPredictions,
  //   hasGeneralPredictions: !!generalPredictions,
  //   loading,
  //   generalPredictionsValue: generalPredictions,
  // });

  const themes = [
    { id: 'light', name: '☀️ Light', description: 'Clean and bright' },
    { id: 'dark', name: '🌙 Dark', description: 'Easy on the eyes' },
    { id: 'ocean', name: '🌊 Ocean', description: 'Deep blue vibes' },
    { id: 'forest', name: '🌲 Forest', description: 'Natural green tones' },
    { id: 'sunset', name: '🌅 Sunset', description: 'Warm orange hues' },
    { id: 'midnight', name: '🌌 Midnight', description: 'Deep purple night' },
    { id: 'arctic', name: '❄️ Arctic', description: 'Cool blue-white' },
    { id: 'cherry', name: '🌸 Cherry', description: 'Soft pink accents' },
  ];

  // Load theme preference and recent PRs from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('currentTheme') || 'light';
    setCurrentTheme(savedTheme);
    document.body.className = `theme-${savedTheme}`;

    // Load recent PRs from localStorage
    const savedPRs = localStorage.getItem('recentPRs');
    if (savedPRs) {
      try {
        setRecentPRs(JSON.parse(savedPRs));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to parse recent PRs from localStorage');
      }
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (showHistory && !event.target.closest('.history-container')) {
        setShowHistory(false);
      }
      if (showThemeDropdown && !event.target.closest('.theme-container')) {
        setShowThemeDropdown(false);
      }
      if (showPrivacyModal && !event.target.closest('.privacy-modal-content')) {
        setShowPrivacyModal(false);
      }
      if (showDeveloperModal && !event.target.closest('.developer-modal-content')) {
        setShowDeveloperModal(false);
      }
      if (showApprovalsInfoModal && !event.target.closest('.approvals-info-modal-content')) {
        setShowApprovalsInfoModal(false);
      }
    };

    if (
      showHistory ||
      showThemeDropdown ||
      showPrivacyModal ||
      showDeveloperModal ||
      showApprovalsInfoModal
    ) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [
    showHistory,
    showThemeDropdown,
    showPrivacyModal,
    showDeveloperModal,
    showApprovalsInfoModal,
  ]);

  // Check if user is visiting for the first time
  useEffect(() => {
    const hasSeenInfoModal = localStorage.getItem('hasSeenInfoModal');
    if (!hasSeenInfoModal) {
      setIsFirstTimeUser(true);
    }
  }, []);

  const changeTheme = themeId => {
    setCurrentTheme(themeId);
    localStorage.setItem('currentTheme', themeId);
    document.body.className = `theme-${themeId}`;
    setShowThemeDropdown(false);
  };

  const toggleThemeDropdown = () => {
    setShowThemeDropdown(!showThemeDropdown);
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  const addToRecentPRs = prData => {
    const newPR = {
      url: prData.prInfo.url,
      title: prData.prInfo.title,
      number: prData.prInfo.number,
      author: prData.prInfo.author,
      analyzedAt: new Date().toISOString(),
      totalGroups: prData.minRequiredApprovals.length,
      needsApproval: prData.totalGroupsNeedingApproval,
    };

    setRecentPRs(prev => {
      // Remove if already exists (to avoid duplicates)
      const filtered = prev.filter(pr => pr.url !== newPR.url);
      // Add to beginning and keep only last 10
      const updated = [newPR, ...filtered].slice(0, 10);
      localStorage.setItem('recentPRs', JSON.stringify(updated));
      return updated;
    });
  };

  const loadFromHistory = prUrl => {
    setPrUrl(prUrl);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setRecentPRs([]);
    localStorage.removeItem('recentPRs');
    setShowHistory(false);
  };

  const deleteFromHistory = (urlToDelete, event) => {
    // Prevent the click event from bubbling up to the history item
    event.stopPropagation();

    setRecentPRs(prev => {
      const filtered = prev.filter(pr => pr.url !== urlToDelete);
      localStorage.setItem('recentPRs', JSON.stringify(filtered));
      return filtered;
    });
  };

  const getMlPredictions = async (files, repoInfo) => {
    // eslint-disable-next-line no-console
    console.log('🚀 DEBUG: getMlPredictions called with:', { files, repoInfo });
    try {
      const response = await axios.post('/api/ml/predict', {
        files,
        confidence: 0.001, // Very low threshold for maximum predictions
        owner: repoInfo?.owner,
        repo: repoInfo?.repo,
        token: githubToken,
      });

      // eslint-disable-next-line no-console
      console.log('✅ DEBUG: ML prediction response:', response.data);
      // eslint-disable-next-line no-console
      console.log('📊 DEBUG: Prediction object:', response.data.prediction);
      // eslint-disable-next-line no-console
      console.log('👥 DEBUG: Individual predictions:', response.data.prediction?.predictions || []);

      return response.data.prediction; // Return the prediction object
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('❌ DEBUG: ML prediction error:', error.response?.data || error.message);
      return null;
    }
  };

  const formatDateIST = dateString => {
    if (!dateString) return 'Loading...';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
      timeZoneName: 'short',
    });
  };

  const getMlModelStats = async () => {
    try {
      const response = await fetch('/api/ml/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // eslint-disable-next-line
        console.warn('Failed to fetch ML model stats');
        return null;
      }

      const data = await response.json();
      if (data.success && data.stats) {
        setMlModelStats(data.stats);
        return data.stats;
      }
    } catch (error) {
      // eslint-disable-next-line
      console.warn('Error fetching ML model stats:', error);
    }
    return null;
  };

  const getTeamApprovalRates = async () => {
    // console.log('🚀 Getting general team approval rates (who approves PRs quickly)...');

    try {
      const statsResponse = await axios.get('/api/ml/stats');
      // console.log('📊 ML stats for team approval rates:', statsResponse.data);

      if (statsResponse.data?.stats?.topApprovers) {
        const topApprovers = statsResponse.data.stats.topApprovers;

        if (topApprovers && topApprovers.length > 0) {
          const totalCount = topApprovers.reduce(
            (sum, item) => sum + (item.totalApprovals || 0),
            0
          );

          if (totalCount > 0) {
            const approvalRates = topApprovers
              .map(item => ({
                approver: item.approver || item.name || item.username,
                confidence: (item.totalApprovals || 0) / totalCount,
                totalApprovals: item.totalApprovals || 0,
                isGeneral: true, // Mark as general approval rate, not file-specific
              }))
              .filter(p => p.approver && p.confidence > 0.01) // Higher threshold for meaningful rates
              .sort((a, b) => b.confidence - a.confidence)
              .slice(0, 20); // Good coverage for teams

            // console.log('✅ Team approval rates found:', approvalRates.length, 'active approvers');
            // console.log(
            //   '📊 Top approvers:',
            //   approvalRates
            //     .slice(0, 5)
            //     .map(p => `${p.approver}: ${Math.round(p.confidence * 100)}%`)
            // );

            return { predictions: approvalRates, isGeneral: true };
          }
        }
      }

      // console.log('❌ No approval statistics available');
      return null;
    } catch (error) {
      // console.log('❌ Error getting team approval rates:', error.message);
      return null;
    }
  };

  const getGeneralPredictions = async _repoInfo => {
    // console.log('🚀 Getting general team approval rates (who approves PRs quickly)...');

    // For teams, we want to know who approves PRs quickly in general, not file-specific expertise
    const prediction = await getTeamApprovalRates();

    if (prediction?.predictions?.length > 0) {
      // console.log(
      //   '✅ Team approval rates found:',
      //   prediction.predictions.length,
      //   'active approvers'
      // );
      return prediction;
    }

    // console.log('❌ No team approval rates available');
    return null;
  };

  const handleSubmit = async e => {
    // console.log('🎬 handleSubmit called');
    e.preventDefault();
    setLoading(true);
    setError('');
    setRateLimitInfo(null);
    setResult(null);
    setMlPredictions(null);
    setGeneralPredictions(null);
    // console.log('🧹 State cleared, making API request...');

    try {
      // console.log('📡 Making API request to /api/pr-approvers...');
      const response = await axios.post('/api/pr-approvers', {
        prUrl,
        githubToken: githubToken || undefined,
      });

      // console.log('✅ API response received:', response.data);
      setResult(response.data);
      setRateLimitInfo(response.data.rateLimitInfo || null);
      addToRecentPRs(response.data);

      // Get ML predictions for the PR files
      // console.log('🔍 Checking if we should fetch ML predictions...');
      // console.log('📁 fileApprovalDetails:', response.data.fileApprovalDetails);
      // console.log('📁 Length:', response.data.fileApprovalDetails?.length);

      if (response.data.fileApprovalDetails && response.data.fileApprovalDetails.length > 0) {
        // console.log('✅ Conditions met - fetching ML predictions');
        const files = response.data.fileApprovalDetails.map(detail => detail.file);

        // Extract repository info from PR URL
        const urlMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
        const repoInfo = urlMatch
          ? {
              owner: urlMatch[1],
              repo: urlMatch[2],
              prNumber: urlMatch[3],
            }
          : null;

        const predictions = await getMlPredictions(files, repoInfo);
        setMlPredictions(predictions);

        // Also fetch general predictions for team members
        // console.log('🔄 Fetching general predictions for team members...');
        // console.log('📋 Repository info:', repoInfo);
        // console.log('🔑 GitHub token available:', !!githubToken);

        const general = await getGeneralPredictions(repoInfo);
        // console.log('📊 General predictions result:', general);

        if (general && general.predictions && general.predictions.length > 0) {
          // console.log('✅ Setting general predictions:', general.predictions.length, 'approvers');
          // console.log(
          //   '👥 General approvers:',
          //   general.predictions.map(p => p.approver)
          // );
        } else {
          // console.log('❌ No general predictions to set');
        }

        setGeneralPredictions(general);
      } else {
        // console.log('❌ ML predictions not fetched - conditions not met');
        // console.log('   - fileApprovalDetails exists:', !!response.data.fileApprovalDetails);
        // console.log(
        //   '   - fileApprovalDetails length:',
        //   response.data.fileApprovalDetails?.length || 0
        // );
      }

      // Always try to fetch general predictions for team members (independent of file details)
      // console.log('🌟 Always attempting general predictions (independent of files)...');
      const urlMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
      const repoInfo = urlMatch
        ? {
            owner: urlMatch[1],
            repo: urlMatch[2],
            prNumber: urlMatch[3],
          }
        : null;

      if (repoInfo) {
        // console.log('🎯 Fetching independent general predictions...');
        const independentGeneral = await getGeneralPredictions(repoInfo);
        // console.log('🎯 Independent general predictions result:', independentGeneral);

        if (
          independentGeneral &&
          independentGeneral.predictions &&
          independentGeneral.predictions.length > 0
        ) {
          // console.log(
          //   '✅ Setting independent general predictions:',
          //   independentGeneral.predictions.length,
          //   'approvers'
          // );
          setGeneralPredictions(independentGeneral);
        }
      } else {
        // console.log('❌ No repository info found for independent general predictions');
      }
    } catch (err) {
      // console.log('❌ Error in handleSubmit:', err);
      // console.log('❌ Error response:', err.response?.data);
      setError(err.response?.data?.error || 'An error occurred');
      setRateLimitInfo(err.response?.data?.rateLimitInfo || null);
    } finally {
      // console.log('🏁 handleSubmit finished, setLoading(false)');
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!result?.minRequiredApprovals) return { completed: 0, total: 0, percentage: 0 };

    const total = result.minRequiredApprovals.length;
    const completed = result.minRequiredApprovals.filter(group => !group.needsApproval).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  const renderProgressRing = () => {
    const { completed, total, percentage } = calculateProgress();
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className='progress-ring-container'>
        <svg className='progress-ring' width='120' height='120'>
          <defs>
            <linearGradient id='progressGradient' x1='0%' y1='0%' x2='100%' y2='0%'>
              <stop offset='0%' stopColor='#667eea' />
              <stop offset='100%' stopColor='#764ba2' />
            </linearGradient>
          </defs>
          <circle className='progress-ring-bg' cx='60' cy='60' r={radius} strokeWidth='8' />
          <circle
            className='progress-ring-fill'
            cx='60'
            cy='60'
            r={radius}
            strokeWidth='8'
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform='rotate(-90 60 60)'
          />
        </svg>
        <div className='progress-ring-text'>
          <div className='progress-percentage'>{percentage}%</div>
          <div className='progress-label'>
            {completed}/{total}
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryDropdown = () => {
    if (!showHistory) return null;

    return (
      <div className='history-dropdown'>
        <div className='history-header'>
          <h3>Recent PRs</h3>
          {recentPRs.length > 0 && (
            <button
              className='clear-history-btn'
              onClick={clearHistory}
              title='Clear history'
              aria-label='Clear history'
              type='button'
              data-1p-ignore
              autoComplete='off'
            >
              🗑️
            </button>
          )}
        </div>
        <div className='history-content'>
          {recentPRs.length === 0 ? (
            <div className='no-history'>
              <span className='no-history-icon'>📋</span>
              <p>No recent PRs analyzed</p>
            </div>
          ) : (
            <div className='history-list'>
              {recentPRs.map((pr, index) => (
                <div key={index} className='history-item' onClick={() => loadFromHistory(pr.url)}>
                  <div className='history-item-main'>
                    <div className='history-title'>{pr.title}</div>
                    <div className='history-meta'>
                      <span className='history-number'>#{pr.number}</span>
                      <span className='history-author'>by @{pr.author}</span>
                    </div>
                  </div>
                  <div className='history-status'>
                    {pr.needsApproval === 0 ? (
                      <span className='history-badge approved'>✅ Ready</span>
                    ) : (
                      <span className='history-badge pending'>{pr.needsApproval} needed</span>
                    )}
                  </div>
                  <button
                    className='history-delete-btn'
                    onClick={e => deleteFromHistory(pr.url, e)}
                    title={`Delete "${pr.title}" from history`}
                    aria-label={`Delete "${pr.title}" from history`}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSkeletonLoader = () => {
    return (
      <div className='skeleton-container'>
        {/* View Toggle Skeleton */}
        <div className='skeleton-view-toggle'>
          <div className='skeleton-toggle-btn'></div>
          <div className='skeleton-toggle-btn'></div>
        </div>

        {/* Progress Section Skeleton */}
        <div className='skeleton-progress-section'>
          <div className='skeleton-progress-overview'>
            <div className='skeleton-progress-ring'></div>
            <div className='skeleton-progress-info'>
              <div className='skeleton-title'></div>
              <div className='skeleton-stats'>
                <div className='skeleton-stat'>
                  <div className='skeleton-stat-number'></div>
                  <div className='skeleton-stat-label'></div>
                </div>
                <div className='skeleton-stat'>
                  <div className='skeleton-stat-number'></div>
                  <div className='skeleton-stat-label'></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Approval Groups Skeleton */}
        <div className='skeleton-approval-section'>
          <div className='skeleton-section-title'></div>
          {[1, 2, 3].map(i => (
            <div key={i} className='skeleton-approval-group'>
              <div className='skeleton-group-header'>
                <div className='skeleton-group-title'></div>
                <div className='skeleton-approved-by'></div>
              </div>
              <div className='skeleton-group-content'>
                <div className='skeleton-group-text'></div>
                <div className='skeleton-users-grid'>
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className='skeleton-user-card'>
                      <div className='skeleton-user-avatar'></div>
                      <div className='skeleton-user-info'>
                        <div className='skeleton-user-name'></div>
                        <div className='skeleton-user-username'></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reviewers Section Skeleton */}
        <div className='skeleton-reviewers-section'>
          <div className='skeleton-section-title'></div>
          <div className='skeleton-users-grid'>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className='skeleton-user-card'>
                <div className='skeleton-user-avatar'></div>
                <div className='skeleton-user-info'>
                  <div className='skeleton-user-name'></div>
                  <div className='skeleton-user-username'></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const [expandedTeams, setExpandedTeams] = useState(new Set());

  const toggleTeamExpansion = teamKey => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamKey)) {
        newSet.delete(teamKey);
      } else {
        newSet.add(teamKey);
      }
      return newSet;
    });
  };

  const renderTeamCard = (team, isApproved = false, approvedMembers = []) => {
    const teamKey = team.slug || team.username;
    const isExpanded = expandedTeams.has(teamKey);
    const memberCount = team.members ? team.members.length : team.memberCount || 0;
    const approvedCount = approvedMembers.length;

    return (
      <div
        key={teamKey}
        className={`user-card team-card ${isApproved ? 'approved' : ''} ${isExpanded ? 'expanded' : ''}`}
      >
        <div
          className='team-header'
          onClick={() => toggleTeamExpansion(teamKey)}
          role='button'
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleTeamExpansion(teamKey);
            }
          }}
        >
          <div className='user-avatar team-avatar'>👥</div>
          <div className='user-info'>
            <div className='user-name'>{team.name}</div>
            <div className='user-username'>
              @{team.username || team.slug}
              {memberCount > 0 && (
                <span className='member-count'>
                  {' '}
                  • {memberCount} member{memberCount !== 1 ? 's' : ''}
                </span>
              )}
              {isApproved && approvedCount > 0 && (
                <span className='approval-count'> • {approvedCount} approved</span>
              )}
            </div>
            {team.description && <div className='team-description'>{team.description}</div>}
          </div>
          <div className='team-expand-indicator'>{isExpanded ? '▼' : '▶'}</div>
          {isApproved && <div className='approval-badge'>✅</div>}
        </div>

        {isExpanded && team.members && team.members.length > 0 && (
          <div className='team-members'>
            <div className='team-members-title'>Team Members:</div>
            <div className='team-members-grid'>
              {team.members.map(member => {
                // Extract actual GitHub username from member object
                const memberUsername = member.login || member.username;
                const memberApproved = approvedMembers.includes(memberUsername);
                // Debug: console.log('Team member:', memberUsername);
                const approvalResult = getGeneralMLApprovalChance(memberUsername);
                return (
                  <div
                    key={memberUsername}
                    className={`team-member ${memberApproved ? 'approved' : ''}`}
                  >
                    <div className='member-avatar'>
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={memberUsername} />
                      ) : (
                        <div className='avatar-placeholder'>👤</div>
                      )}
                    </div>
                    <div className='member-info'>
                      <div className='member-name'>{member.name}</div>
                      <div className='member-username'>
                        @{memberUsername}
                        {approvalResult && (
                          <span
                            className={`ml-approval-chance ${approvalResult.isGeneral ? 'general' : ''}`}
                          >
                            {approvalResult.percentage}% approver
                            {approvalResult.isGeneral && (
                              <span
                                className='general-indicator'
                                title='General approval rate (how often this person approves PRs)'
                              >
                                ⚡
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      {memberApproved && <div className='member-approved'>✅ Approved</div>}
                    </div>
                    {memberApproved && <div className='member-approval-badge'>✅</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isExpanded && (!team.members || team.members.length === 0) && (
          <div className='team-members'>
            <div className='team-members-empty'>
              {result?.teamsConfigured
                ? 'No members found or insufficient permissions to view team members.'
                : 'Team member details unavailable. Add a GitHub token with org:read scope to view team members.'}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getMLApprovalChance = username => {
    // Debug logging to see what's happening
    // eslint-disable-next-line no-console
    console.log('🔍 DEBUG: getMLApprovalChance called for:', username);
    // eslint-disable-next-line no-console
    console.log('📊 DEBUG: mlPredictions available:', !!mlPredictions);
    // eslint-disable-next-line no-console
    console.log('📊 DEBUG: mlPredictions structure:', mlPredictions);
    // eslint-disable-next-line no-console
    console.log('📊 DEBUG: mlPredictions.predictions:', mlPredictions?.predictions?.length || 0);

    if (!mlPredictions?.predictions || !username) {
      // eslint-disable-next-line no-console
      console.log('❌ DEBUG: No ML predictions or username for:', username);
      return null;
    }

    // Debug: show available predictions
    // eslint-disable-next-line no-console
    console.log(
      '👥 DEBUG: Available predictions:',
      mlPredictions.predictions.map(p => p.approver)
    );

    // Try exact match first
    let prediction = mlPredictions.predictions.find(p => p.approver === username);
    // eslint-disable-next-line no-console
    console.log('🎯 DEBUG: Exact match found:', !!prediction, 'for', username);

    // Try with @ prefix if no exact match
    if (!prediction) {
      prediction = mlPredictions.predictions.find(p => p.approver === `@${username}`);
      // eslint-disable-next-line no-console
      console.log('🎯 DEBUG: @ prefix match found:', !!prediction, `for @${username}`);
    }

    if (!prediction) {
      // eslint-disable-next-line no-console
      console.log('❌ DEBUG: No prediction found for:', username);
      return null;
    }

    const percentage = prediction.confidence * 100;
    const result = percentage >= 1 ? Math.round(percentage) : Math.round(percentage * 10) / 10;
    const isFallback = prediction.isFallback || false;
    // eslint-disable-next-line no-console
    console.log(
      '✅ DEBUG: ML prediction for',
      username,
      ':',
      `${result}%`,
      isFallback ? '(fallback)' : ''
    );
    return { percentage: result, isFallback };
  };

  const getGeneralMLApprovalChance = username => {
    if (!generalPredictions?.predictions || !username) {
      // console.log('No general approval rates or username:', {
      //   hasGeneralPredictions: !!generalPredictions?.predictions,
      //   username,
      // });
      return null;
    }

    // console.log('Looking for general approval rate for:', username);

    // Find approval rate for this user in general predictions
    let prediction = generalPredictions.predictions.find(p => p.approver === username);
    if (!prediction) {
      prediction = generalPredictions.predictions.find(p => p.approver === `@${username}`);
    }

    if (!prediction) {
      // console.log('No general approval rate found for:', username);
      return null;
    }

    const percentage = prediction.confidence * 100;
    const result = percentage >= 1 ? Math.round(percentage) : Math.round(percentage * 10) / 10;
    // console.log('General approval rate for', username, ':', `${result}%`);
    return { percentage: result, isGeneral: true };
  };

  const renderUserCard = (user, isApproved = false, approvedMembers = []) => {
    const approvalResult = getMLApprovalChance(user.username);
    if (user.type === 'team') {
      return renderTeamCard(user, isApproved, approvedMembers);
    }

    return (
      <div key={user.username} className={`user-card ${isApproved ? 'approved' : ''}`}>
        <div className='user-avatar'>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} />
          ) : (
            <div className='avatar-placeholder'>👤</div>
          )}
        </div>
        <div className='user-info'>
          <div className='user-name'>{user.name}</div>
          <div className='user-username'>
            @{user.username}
            {approvalResult && (
              <span className={`ml-approval-chance ${approvalResult.isFallback ? 'fallback' : ''}`}>
                {approvalResult.percentage}% likely
                {approvalResult.isFallback && (
                  <span
                    className='fallback-indicator'
                    title='Using file pattern matching (supplemental prediction)'
                  >
                    *
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        {isApproved && <div className='approval-badge'>✅</div>}
      </div>
    );
  };

  const renderThemeDropdown = () => {
    if (!showThemeDropdown) return null;

    return (
      <div className='theme-dropdown'>
        <div className='theme-header'>
          <h3>🎨 Choose Theme</h3>
        </div>
        <div className='theme-content'>
          <div className='theme-grid'>
            {themes.map(theme => (
              <button
                key={theme.id}
                className={`theme-option ${currentTheme === theme.id ? 'active' : ''}`}
                onClick={() => changeTheme(theme.id)}
                type='button'
                data-1p-ignore
                autoComplete='off'
              >
                <div className={`theme-preview theme-${theme.id}`}></div>
                <div className='theme-info'>
                  <div className='theme-name'>{theme.name}</div>
                  <div className='theme-description'>{theme.description}</div>
                </div>
                {currentTheme === theme.id && <div className='theme-check'>✓</div>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPrivacyModal = () => {
    if (!showPrivacyModal) return null;

    return (
      <div className='privacy-modal-overlay'>
        <div className='privacy-modal-content'>
          <div className='privacy-modal-header'>
            <h3>🔒 Privacy & Security Information</h3>
            <button
              className='privacy-modal-close'
              onClick={() => setShowPrivacyModal(false)}
              type='button'
              aria-label='Close privacy modal'
            >
              ✕
            </button>
          </div>
          <div className='privacy-modal-body'>
            <div className='privacy-section'>
              <h4>🛡️ Data Storage & Security</h4>
              <ul>
                <li>
                  <strong>No Server Storage:</strong> This application does not store any of your
                  data on our servers.
                </li>
                <li>
                  <strong>Local Storage Only:</strong> Your GitHub tokens and recent PR history are
                  stored locally in your browser&apos;s localStorage.
                </li>
                <li>
                  <strong>Automatic Cleanup:</strong> All data is automatically cleared when you
                  clear your browser data or use incognito mode.
                </li>
                <li>
                  <strong>No Tracking:</strong> We don&apos;t track your usage or collect any
                  personal information.
                </li>
              </ul>
            </div>
            <div className='privacy-section'>
              <h4>🔑 GitHub Token Handling</h4>
              <ul>
                <li>
                  <strong>Client-Side Only:</strong> Your GitHub token is processed entirely in your
                  browser.
                </li>
                <li>
                  <strong>Direct API Calls:</strong> Tokens are sent directly to GitHub&apos;s API,
                  never to our servers.
                </li>
                <li>
                  <strong>No Persistence:</strong> Tokens are not permanently stored and are cleared
                  when you close the browser.
                </li>
                <li>
                  <strong>Your Control:</strong> You can clear stored tokens anytime by clearing
                  browser data.
                </li>
              </ul>
            </div>
            <div className='privacy-section'>
              <h4>🌐 Third-Party Connections</h4>
              <ul>
                <li>
                  <strong>GitHub API:</strong> Direct connection to GitHub&apos;s public API for PR
                  analysis.
                </li>
                <li>
                  <strong>Cloudflare:</strong> Used for security and performance (no data storage).
                </li>
                <li>
                  <strong>No Analytics:</strong> No Google Analytics, tracking pixels, or other
                  monitoring tools.
                </li>
              </ul>
            </div>
            <div className='privacy-section'>
              <h4>🧹 How to Clear Your Data</h4>
              <ul>
                <li>Clear your browser&apos;s localStorage</li>
                <li>Use incognito/private browsing mode</li>
                <li>Clear site data in your browser settings</li>
                <li>Use the &quot;Clear History&quot; button in the recent PRs dropdown</li>
              </ul>
            </div>
          </div>
          <div className='privacy-modal-footer'>
            <p>
              <strong>Open Source:</strong> This project is open source. You can review the code on{' '}
              <a
                href='https://github.com/Aswin-coder/pr-review-checker'
                target='_blank'
                rel='noopener noreferrer'
              >
                GitHub
              </a>{' '}
              to verify these privacy practices.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderCloudflareModal = () => {
    if (!showCloudflareModal) return null;

    return (
      <div className='cloudflare-modal-overlay' onClick={() => setShowCloudflareModal(false)}>
        <div className='cloudflare-modal-content' onClick={e => e.stopPropagation()}>
          <div className='cloudflare-modal-header'>
            <h3>🛡️ Cloudflare Security & Performance</h3>
            <button
              className='cloudflare-modal-close'
              onClick={() => setShowCloudflareModal(false)}
              type='button'
              aria-label='Close Cloudflare info modal'
            >
              ✕
            </button>
          </div>
          <div className='cloudflare-modal-body'>
            <div className='cloudflare-section'>
              <h4>🔒 Security Protection</h4>
              <ul>
                <li>
                  <strong>DDoS Protection:</strong> Advanced protection against distributed
                  denial-of-service attacks and malicious traffic.
                </li>
                <li>
                  <strong>Web Application Firewall:</strong> Filters malicious requests and blocks
                  common web threats before they reach our servers.
                </li>
                <li>
                  <strong>SSL/TLS Encryption:</strong> All data transmitted between your browser and
                  our site is encrypted with industry-standard protocols.
                </li>
                <li>
                  <strong>Bot Protection:</strong> Intelligent filtering of malicious bots and
                  automated attacks while allowing legitimate traffic.
                </li>
              </ul>
            </div>
            <div className='cloudflare-section'>
              <h4>⚡ Performance Benefits</h4>
              <ul>
                <li>
                  <strong>Global CDN:</strong> Content delivered from 300+ data centers worldwide
                  for faster loading times.
                </li>
                <li>
                  <strong>Smart Caching:</strong> Static assets cached globally to reduce server
                  load and improve response times.
                </li>
                <li>
                  <strong>Image Optimization:</strong> Automatic image compression and format
                  optimization for faster loading.
                </li>
                <li>
                  <strong>Bandwidth Optimization:</strong> Intelligent compression reduces bandwidth
                  usage without sacrificing quality.
                </li>
              </ul>
            </div>
            <div className='cloudflare-section'>
              <h4>🌐 Reliability Features</h4>
              <ul>
                <li>
                  <strong>99.99% Uptime:</strong> Enterprise-grade infrastructure ensuring maximum
                  availability and reliability.
                </li>
                <li>
                  <strong>Load Balancing:</strong> Traffic intelligently distributed across multiple
                  servers for optimal performance.
                </li>
                <li>
                  <strong>Always Online™:</strong> Serves cached versions of your content if the
                  origin server is temporarily unavailable.
                </li>
                <li>
                  <strong>Real-time Monitoring:</strong> Continuous monitoring and automatic
                  mitigation of potential issues.
                </li>
              </ul>
            </div>
          </div>
          <div className='cloudflare-modal-footer'>
            <p>
              <strong>Learn More:</strong> Visit{' '}
              <a
                href='https://www.cloudflare.com/security/'
                target='_blank'
                rel='noopener noreferrer'
              >
                Cloudflare Security
              </a>{' '}
              to learn more about how these features protect and accelerate your browsing
              experience.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderApprovalsInfoModal = () => {
    if (!showApprovalsInfoModal) return null;

    return (
      <div className='approvals-info-modal-overlay'>
        <div className='approvals-info-modal-content'>
          <div className='approvals-info-modal-header'>
            <h3>ℹ️ How Approval Grouping Works</h3>
            <button
              className='approvals-info-modal-close'
              onClick={() => setShowApprovalsInfoModal(false)}
              type='button'
              aria-label='Close'
            >
              ×
            </button>
          </div>
          <div className='approvals-info-modal-body'>
            <div className='info-section'>
              <h4>📋 What are Approval Groups?</h4>
              <p>
                Files in your PR are grouped based on their CODEOWNERS patterns. Each group requires
                approval from <strong>ANY ONE</strong> of the listed reviewers.
              </p>
            </div>

            <div className='info-section'>
              <h4>🎯 Group Requirements</h4>
              <ul>
                <li>
                  <strong>✅ Approved Groups:</strong> At least one required reviewer has already
                  approved
                </li>
                <li>
                  <strong>❌ Pending Groups:</strong> Still need approval from any listed reviewer
                </li>
                <li>
                  <strong>👥 Team Approvals:</strong> Any team member can approve for the entire
                  team
                </li>
              </ul>
            </div>

            <div className='info-section'>
              <h4>🤖 ML Predictions</h4>
              <p>
                Purple badges show ML-predicted approval likelihood based on historical patterns.
                These are <strong>guidance only</strong> and trained specifically on the
                tenstorrent/tt-metal repository.
              </p>

              <div className='ml-stats-summary'>
                <h5>📊 Training Data Details:</h5>
                <ul>
                  <li>
                    <strong>Training Set:</strong>{' '}
                    {mlModelStats?.trainingData?.totalPRs || 'Loading...'} PRs from
                    tenstorrent/tt-metal repository
                    {mlModelStats?.isModelLoaded === false && (
                      <span
                        className='fallback-indicator'
                        title='Using cached training data - ML model not fully loaded in this deployment'
                      >
                        {' '}
                        (cached)
                      </span>
                    )}
                  </li>
                  <li>
                    <strong>Last Updated:</strong> {formatDateIST(mlModelStats?.lastTrained)}
                  </li>
                  <li>
                    <strong>Learned Patterns:</strong>{' '}
                    {mlModelStats?.trainingData?.totalApprovers || 'Loading...'} unique approvers
                  </li>
                  <li>
                    <strong>Accuracy:</strong> Predictive guidance only - not 100% accurate
                  </li>
                </ul>
              </div>
            </div>

            <div className='info-section'>
              <h4>💡 Tips</h4>
              <ul>
                <li>Focus on pending groups - they&apos;re blocking your PR merge</li>
                <li>Contact reviewers with higher ML prediction percentages first</li>
                <li>Team members can approve for their entire team</li>
                <li>Use Advanced view to see which specific files need each approval</li>
              </ul>
            </div>
          </div>
          <div className='approvals-info-modal-footer'>
            <p>Need help? Use the feedback button to report issues or ask questions.</p>
          </div>
        </div>
      </div>
    );
  };

  // Fetch ML stats when developer modal or approvals info modal opens
  React.useEffect(() => {
    if (showDeveloperModal || showApprovalsInfoModal) {
      getMlModelStats();
    }
  }, [showDeveloperModal, showApprovalsInfoModal]);

  const renderDeveloperModal = () => {
    if (!showDeveloperModal) return null;

    return (
      <div className='developer-modal-overlay'>
        <div className='developer-modal-content'>
          <div className='developer-modal-header'>
            <h3>🚧 Development Status</h3>
            <button
              className='developer-modal-close'
              onClick={() => setShowDeveloperModal(false)}
              type='button'
              aria-label='Close'
            >
              ×
            </button>
          </div>
          <div className='developer-modal-body'>
            <div className='developer-section'>
              <h4>👨‍💻 Current Status</h4>
              <ul>
                <li>
                  <strong>Version:</strong> v{APP_VERSION_SHORT} - Actively under development
                </li>
                <li>
                  <strong>Features:</strong> Core functionality is stable and tested
                </li>
                <li>
                  <strong>Updates:</strong> Regular improvements and bug fixes
                </li>
                <li>
                  <strong>Feedback:</strong> User suggestions help drive development priorities
                </li>
              </ul>
            </div>

            <div className='developer-section'>
              <h4>🐛 Known Areas</h4>
              <ul>
                <li>
                  <strong>CODEOWNERS parsing:</strong> Complex patterns may need refinement
                </li>
                <li>
                  <strong>Team detection:</strong> Some edge cases in team member resolution
                </li>
                <li>
                  <strong>UI/UX:</strong> Continuously improving based on user feedback
                </li>
                <li>
                  <strong>Performance:</strong> Optimizing for large repositories
                </li>
              </ul>
            </div>

            <div className='developer-section'>
              <h4>🤖 ML Prediction Model</h4>
              <ul>
                <li>
                  <strong>Training Data:</strong> Trained specifically on Tenstorrent&apos;s{' '}
                  tenstorrent/tt-metal repository
                </li>
                <li>
                  <strong>Dataset Size:</strong>{' '}
                  {mlModelStats?.trainingData?.totalPRs || 'Loading...'} PRs used for training
                  {mlModelStats?.isModelLoaded === false && (
                    <span
                      className='fallback-indicator'
                      title='Using cached training data - ML model not fully loaded in this deployment'
                    >
                      {' '}
                      (cached)
                    </span>
                  )}
                </li>
                <li>
                  <strong>Last Trained:</strong> {formatDateIST(mlModelStats?.lastTrained)}
                </li>
                <li>
                  <strong>Total Approvers:</strong>{' '}
                  {mlModelStats?.trainingData?.totalApprovers || 'Loading...'} unique approvers
                  learned
                </li>
                <li>
                  <strong>Accuracy:</strong> ML predictions are not 100% accurate - use as guidance
                  only
                </li>
                <li>
                  <strong>Scope:</strong> Best results for tenstorrent/tt-metal repo; may not work
                  well for other repositories
                </li>
                <li>
                  <strong>Retraining:</strong> Model can be retrained with more recent data if
                  needed
                </li>
              </ul>
              <p>
                <strong>Note:</strong> If you find ML predictions are inaccurate or need model
                retraining, please share feedback below. The model learns from historical approval
                patterns and may not reflect recent changes in team structure or responsibilities.
              </p>
            </div>

            <div className='developer-section'>
              <h4>💬 Help Us Improve</h4>
              <p>
                Your feedback is invaluable! If you encounter any issues, have suggestions, or want
                to report bugs, please let us know:
              </p>
              <button
                className='developer-feedback-btn'
                onClick={() => {
                  setFeedbackPrefillData({
                    type: 'bug',
                    subject: 'Bug Report / Feature Request',
                    message: 'I found an issue or have a suggestion:\n\n',
                  });
                  setShowFeedbackForm(true);
                  setShowDeveloperModal(false);
                }}
                type='button'
              >
                🚀 Share Feedback
              </button>
            </div>
          </div>
          <div className='developer-modal-footer'>
            <p>
              Built with ❤️ by{' '}
              <a href='https://github.com/Aswin-coder' target='_blank' rel='noopener noreferrer'>
                Aswin
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`App theme-${currentTheme}`}>
      <header className='App-header'>
        <div className='header-content'>
          <div>
            <h1>🔍 PR Approval Finder</h1>
            <p>Find minimum required approvals for your Pull Request</p>
          </div>
          <div className='header-controls'>
            <div className='history-container'>
              <button
                className='history-btn'
                onClick={toggleHistory}
                title='Recent PRs'
                aria-label='Recent PRs'
                type='button'
                data-1p-ignore
                autoComplete='off'
              >
                📋
                {recentPRs.length > 0 && <span className='history-count'>{recentPRs.length}</span>}
              </button>
              {renderHistoryDropdown()}
            </div>
            <div className='theme-container'>
              <button
                className='theme-toggle'
                onClick={toggleThemeDropdown}
                title='Choose theme'
                aria-label='Choose theme'
                type='button'
                data-1p-ignore
                autoComplete='off'
              >
                🎨
              </button>
              {renderThemeDropdown()}
            </div>
            <button
              className='feedback-btn'
              onClick={() => setShowFeedbackForm(true)}
              title='Send feedback'
              aria-label='Send feedback'
              type='button'
              data-1p-ignore
              autoComplete='off'
            >
              💬
            </button>
          </div>
        </div>
      </header>

      <main className='main-content'>
        <form onSubmit={handleSubmit} className='pr-form'>
          <div className='form-group'>
            <label htmlFor='prUrl'>GitHub PR URL:</label>
            <input
              type='url'
              id='prUrl'
              value={prUrl}
              onChange={e => setPrUrl(e.target.value)}
              placeholder='https://github.com/owner/repo/pull/123'
              required
            />
          </div>

          <div className='form-group'>
            <label htmlFor='githubToken'>
              GitHub Token (optional - for private repos, team access & higher rate limits):
            </label>
            <input
              type='password'
              id='githubToken'
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              placeholder='ghp_xxxxxxxxxxxxxxxxxxxx'
            />
          </div>

          <button type='submit' disabled={loading} className='analyze-btn'>
            {loading ? (
              <>
                <span className='spinner'></span>
                Analyzing...
              </>
            ) : (
              <>
                <span className='btn-icon'>🚀</span>
                Analyze PR
              </>
            )}
          </button>
        </form>

        {error && (
          <div className='error-message'>
            <div className='error-content'>
              <span className='error-icon'>⚠️</span>
              <div className='error-text'>
                <strong>Error:</strong> {error}
              </div>
            </div>
            {rateLimitInfo && rateLimitInfo.showWarning && (
              <div className='rate-limit-info'>
                <div className='rate-limit-header'>
                  <span className='rate-limit-icon'>⏱️</span>
                  <strong>Rate Limit Details:</strong>
                </div>
                <div className='rate-limit-details'>
                  <div className='rate-limit-item'>
                    <span className='rate-limit-label'>Remaining:</span>
                    <span className='rate-limit-value'>
                      {rateLimitInfo.remaining}/{rateLimitInfo.limit}
                    </span>
                  </div>
                  <div className='rate-limit-item'>
                    <span className='rate-limit-label'>Resets in:</span>
                    <span className='rate-limit-value'>
                      {rateLimitInfo.minutesUntilReset} minute
                      {rateLimitInfo.minutesUntilReset !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className='rate-limit-item'>
                    <span className='rate-limit-label'>Reset time:</span>
                    <span className='rate-limit-value'>{rateLimitInfo.resetTimeFormatted}</span>
                  </div>
                </div>
                <div className='rate-limit-tip'>
                  💡 <strong>Tip:</strong> Add a GitHub token above for 5,000 requests/hour instead
                  of 60/hour
                </div>
              </div>
            )}
          </div>
        )}

        {loading && renderSkeletonLoader()}

        {result && !loading && (
          <div className='results'>
            {/* PR Title Section */}
            <div className='pr-title-section'>
              <div className='pr-title-container'>
                <div className='pr-title-main'>
                  <h2 className='pr-title'>{result.prInfo.title}</h2>
                  <div className='pr-meta'>
                    <span className='pr-number'>#{result.prInfo.number}</span>
                    <span className='pr-author'>by @{result.prInfo.author}</span>
                    <span className='pr-state' data-state={result.prInfo.state.toLowerCase()}>
                      {result.prInfo.state === 'draft' && '📝 Draft'}
                      {result.prInfo.state === 'merged' && '✅ Merged'}
                      {result.prInfo.state === 'closed' && '❌ Closed'}
                      {result.prInfo.state === 'open' && '🔓 Open'}
                    </span>
                    {result.prInfo.statusDetails && (
                      <>
                        {result.prInfo.statusDetails.isMerged &&
                          result.prInfo.statusDetails.mergedAt && (
                            <span className='pr-status-note'>
                              ✅ Merged{' '}
                              {new Date(result.prInfo.statusDetails.mergedAt).toLocaleDateString()}
                            </span>
                          )}
                        {result.prInfo.statusDetails.mergeableState &&
                          result.prInfo.statusDetails.mergeableState !== 'unknown' &&
                          result.prInfo.statusDetails.mergeableState !== 'clean' &&
                          !result.prInfo.statusDetails.isDraft && (
                            <span className='pr-status-note'>
                              🔄 {result.prInfo.statusDetails.mergeableState}
                            </span>
                          )}
                      </>
                    )}
                  </div>
                </div>
                <a
                  href={result.prInfo.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='pr-link-btn'
                  title='Open PR in GitHub'
                  aria-label='Open PR in GitHub'
                >
                  🔗 View PR
                </a>
              </div>
            </div>

            {/* Rate Limit Warning for successful requests */}
            {rateLimitInfo && rateLimitInfo.showWarning && (
              <div className='rate-limit-warning-standalone'>
                <div className='rate-limit-warning'>
                  ⚠️ <strong>Low Rate Limit Warning:</strong> You have {rateLimitInfo.remaining}{' '}
                  requests remaining.
                  {githubToken
                    ? `Wait ${rateLimitInfo.minutesUntilReset} minute${rateLimitInfo.minutesUntilReset !== 1 ? 's' : ''} for reset or consider using a fresh token.`
                    : `Consider using a GitHub token for higher limits or wait ${rateLimitInfo.minutesUntilReset} minute${rateLimitInfo.minutesUntilReset !== 1 ? 's' : ''} for reset.`}
                </div>
              </div>
            )}

            {/* View Toggle */}
            <div className='view-toggle'>
              <button
                className={`toggle-btn ${viewMode === 'basic' ? 'active' : ''}`}
                onClick={() => setViewMode('basic')}
                type='button'
                data-1p-ignore
                autoComplete='off'
              >
                📊 Basic View
              </button>
              <button
                className={`toggle-btn ${viewMode === 'advanced' ? 'active' : ''}`}
                onClick={() => setViewMode('advanced')}
                type='button'
                data-1p-ignore
                autoComplete='off'
              >
                🔬 Advanced View
              </button>
            </div>

            {/* Progress Overview */}
            <section className='progress-section'>
              <div className='progress-overview'>
                {renderProgressRing()}
                <div className='progress-info'>
                  <h2>Approval Progress</h2>
                  <div className='progress-stats'>
                    <div className='stat'>
                      <span className='stat-number'>{result.totalGroupsNeedingApproval}</span>
                      <span className='stat-label'>
                        more approval{result.totalGroupsNeedingApproval !== 1 ? 's' : ''} needed
                      </span>
                    </div>
                    <div className='stat'>
                      <span className='stat-number'>{calculateProgress().completed}</span>
                      <span className='stat-label'>
                        group{calculateProgress().completed !== 1 ? 's' : ''} satisfied
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Basic View */}
            {viewMode === 'basic' && (
              <>
                {/* Minimum Required Approvals */}
                <section className='approval-section'>
                  <div className='section-header-with-info'>
                    <h2>🎯 Required Approvals</h2>
                    <div className='info-button-container'>
                      <button
                        className={`info-button ${isFirstTimeUser ? 'first-time-pulse' : ''}`}
                        onClick={() => {
                          setShowApprovalsInfoModal(true);
                          if (isFirstTimeUser) {
                            setIsFirstTimeUser(false);
                            localStorage.setItem('hasSeenInfoModal', 'true');
                          }
                        }}
                        title='How approval grouping works'
                        aria-label='Information about approval grouping'
                        type='button'
                        data-tooltip='Click for more info'
                      >
                        i
                      </button>
                      <span
                        className='help-text'
                        onClick={() => {
                          setShowApprovalsInfoModal(true);
                          if (isFirstTimeUser) {
                            setIsFirstTimeUser(false);
                            localStorage.setItem('hasSeenInfoModal', 'true');
                          }
                        }}
                      >
                        Click to learn how this works!
                      </span>
                    </div>
                  </div>

                  {result.minRequiredApprovals.map((group, index) => (
                    <div
                      key={index}
                      className={`approval-group ${group.needsApproval ? 'needs-approval' : 'approved'}`}
                    >
                      <div className='group-header'>
                        <h3>
                          {group.needsApproval ? '❌' : '✅'}
                          Group {index + 1} ({group.files.length} file
                          {group.files.length !== 1 ? 's' : ''})
                        </h3>
                        {!group.needsApproval && (
                          <span className='approved-by'>
                            {group.approverType === 'team' ? (
                              <>
                                Approved by @{group.approvedBy} (member of {group.teamName})
                              </>
                            ) : (
                              <>Approved by @{group.approvedBy}</>
                            )}
                          </span>
                        )}
                      </div>

                      <div className='group-options'>
                        <p>
                          <strong>Need approval from ANY ONE of:</strong>
                        </p>
                        <div className='users-grid'>
                          {group.ownerDetails.map(user => {
                            const isApproved =
                              !group.needsApproval &&
                              (user.username === group.approvedBy ||
                                (user.type === 'team' &&
                                  (group.teamName === user.username ||
                                    group.teamName?.endsWith(user.name))));
                            const approvedMembers =
                              user.type === 'team' &&
                              (group.teamName === user.username ||
                                group.teamName?.endsWith(user.name))
                                ? group.approvedTeamMembers || []
                                : [];
                            return renderUserCard(user, isApproved, approvedMembers);
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </section>

                {/* All Reviewers */}
                <section className='reviewers-section'>
                  <h2>👥 All Possible Reviewers</h2>
                  <div className='users-grid'>
                    {result.allUserDetails.map(user => {
                      const isApproved = result.approvals.includes(user.username);
                      const isRequested = result.requestedReviewers.includes(user.username);
                      return (
                        <div
                          key={user.username}
                          className={`user-card ${isApproved ? 'approved' : ''} ${isRequested ? 'requested' : ''}`}
                        >
                          <div className='user-avatar'>
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.username} />
                            ) : user.type === 'team' ? (
                              <div className='team-avatar'>👥</div>
                            ) : (
                              <div className='avatar-placeholder'>👤</div>
                            )}
                          </div>
                          <div className='user-info'>
                            <div className='user-name'>{user.name}</div>
                            <div className='user-username'>
                              @{user.username}
                              {(() => {
                                const approvalResult = getMLApprovalChance(user.username);
                                return (
                                  approvalResult && (
                                    <span
                                      className={`ml-approval-chance ${approvalResult.isFallback ? 'fallback' : ''}`}
                                    >
                                      {approvalResult.percentage}% likely
                                      {approvalResult.isFallback && (
                                        <span
                                          className='fallback-indicator'
                                          title='Using file pattern matching (supplemental prediction)'
                                        >
                                          *
                                        </span>
                                      )}
                                    </span>
                                  )
                                );
                              })()}
                            </div>
                            {isRequested && <div className='user-status'>Requested</div>}
                          </div>
                          {isApproved && <div className='approval-badge'>✅</div>}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {/* Advanced View */}
            {viewMode === 'advanced' && (
              <>
                {/* Minimum Required Approvals */}
                <section className='approval-section'>
                  <div className='section-header-with-info'>
                    <h2>🎯 Required Approvals</h2>
                    <div className='info-button-container'>
                      <button
                        className={`info-button ${isFirstTimeUser ? 'first-time-pulse' : ''}`}
                        onClick={() => {
                          setShowApprovalsInfoModal(true);
                          if (isFirstTimeUser) {
                            setIsFirstTimeUser(false);
                            localStorage.setItem('hasSeenInfoModal', 'true');
                          }
                        }}
                        title='How approval grouping works'
                        aria-label='Information about approval grouping'
                        type='button'
                        data-tooltip='Click for more info'
                      >
                        i
                      </button>
                      <span
                        className='help-text'
                        onClick={() => {
                          setShowApprovalsInfoModal(true);
                          if (isFirstTimeUser) {
                            setIsFirstTimeUser(false);
                            localStorage.setItem('hasSeenInfoModal', 'true');
                          }
                        }}
                      >
                        Click to learn how this works!
                      </span>
                    </div>
                  </div>

                  {result.minRequiredApprovals.map((group, index) => (
                    <div
                      key={index}
                      className={`approval-group ${group.needsApproval ? 'needs-approval' : 'approved'}`}
                    >
                      <div className='group-header'>
                        <h3>
                          {group.needsApproval ? '❌' : '✅'}
                          Group {index + 1} ({group.files.length} file
                          {group.files.length !== 1 ? 's' : ''})
                        </h3>
                        {!group.needsApproval && (
                          <span className='approved-by'>
                            {group.approverType === 'team' ? (
                              <>
                                Approved by @{group.approvedBy} (member of {group.teamName})
                              </>
                            ) : (
                              <>Approved by @{group.approvedBy}</>
                            )}
                          </span>
                        )}
                      </div>

                      <div className='group-files'>
                        <details>
                          <summary>📁 View files ({group.files.length})</summary>
                          <ul className='file-list'>
                            {group.files.map((file, fileIndex) => (
                              <li key={fileIndex} className='file-item'>
                                <span className='file-path'>{file}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>

                      <div className='group-options'>
                        <p>
                          <strong>Need approval from ANY ONE of:</strong>
                        </p>
                        <div className='users-grid'>
                          {group.ownerDetails.map(user => {
                            const isApproved =
                              !group.needsApproval &&
                              (user.username === group.approvedBy ||
                                (user.type === 'team' &&
                                  (group.teamName === user.username ||
                                    group.teamName?.endsWith(user.name))));
                            const approvedMembers =
                              user.type === 'team' &&
                              (group.teamName === user.username ||
                                group.teamName?.endsWith(user.name))
                                ? group.approvedTeamMembers || []
                                : [];
                            return renderUserCard(user, isApproved, approvedMembers);
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </section>

                {/* File-by-file Analysis */}
                <section className='file-analysis-section'>
                  <h2>📄 File-by-File Analysis</h2>
                  <div className='file-analysis'>
                    {result.fileApprovalDetails.map((detail, index) => (
                      <div key={index} className='file-detail'>
                        <div className='file-path-container'>
                          <span className='file-directory'>
                            {detail.file.split('/').slice(0, -1).join('/')}/
                          </span>
                          <span className='file-name'>{detail.file.split('/').pop()}</span>
                        </div>
                        <div className='file-pattern'>
                          <strong>Pattern:</strong> {detail.pattern}
                        </div>
                        <div className='file-owners'>
                          <strong>Owners:</strong> {detail.owners.join(', ') || 'None'}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Current Status */}
                <section className='status-section'>
                  <h2>📊 Current Status</h2>
                  <div className='status-grid'>
                    <div className='status-item'>
                      <h3>✅ Current Approvals</h3>
                      <div className='status-list'>
                        {result.approvals.length > 0 ? (
                          result.approvals.map(approval => (
                            <span key={approval} className='status-badge approved'>
                              @{approval}
                            </span>
                          ))
                        ) : (
                          <span className='no-items'>No approvals yet</span>
                        )}
                      </div>
                    </div>

                    <div className='status-item'>
                      <h3>👀 Requested Reviewers</h3>
                      <div className='status-list'>
                        {result.requestedReviewers.length > 0 ? (
                          result.requestedReviewers.map(reviewer => (
                            <span key={reviewer} className='status-badge requested'>
                              @{reviewer}
                            </span>
                          ))
                        ) : (
                          <span className='no-items'>No reviewers requested</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Feedback Call-to-Action Section */}
            <section className='feedback-cta-section'>
              <div className='feedback-cta-container'>
                <div className='feedback-cta-content'>
                  <h3>🤔 Found any issues with group separation?</h3>
                  <p>
                    If you noticed any mismatches in how we grouped the required approvals or
                    CODEOWNERS matching, we&apos;d love to hear from you! Your feedback helps us
                    improve the accuracy of our analysis.
                  </p>
                  <button
                    className='feedback-cta-btn'
                    onClick={() => {
                      setFeedbackPrefillData({
                        type: 'improvement',
                        subject: `CODEOWNERS Analysis Feedback - PR #${result.prInfo.number}`,
                        message: `PR URL: ${result.prInfo.url}\n\nI found the following issues with the group separation or CODEOWNERS matching:\n\n`,
                      });
                      setShowFeedbackForm(true);
                    }}
                    type='button'
                  >
                    💬 Report Issue & Suggest Improvements
                  </button>
                  <p className='feedback-cta-note'>
                    We&apos;ll prefill the PR details to make it easier for you to report specific
                    issues.
                  </p>
                </div>
                <div className='feedback-cta-icon'>🎯</div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Copyright Footer */}
      <footer className='app-footer'>
        <div className='footer-content'>
          <div className='footer-left'>
            <div className='copyright' title='Assisted with Cursor AI'>
              © 2025 Aswin
            </div>
          </div>
          <div className='footer-center'>
            <button
              className='footer-privacy-btn'
              onClick={() => setShowPrivacyModal(true)}
              title='Privacy & Security Information'
              aria-label='Privacy & Security Information'
              type='button'
            >
              🔒 Privacy
            </button>
          </div>
          <div className='footer-right'>
            <button
              className='cloudflare-badge'
              onClick={() => setShowCloudflareModal(true)}
              title='Learn about Cloudflare security & performance'
              aria-label='Learn about Cloudflare security & performance'
              type='button'
            >
              🛡️ Protected by Cloudflare
            </button>
            <button
              className='version-info'
              onClick={() => setShowDeveloperModal(true)}
              title='Developer Info & Status'
              aria-label='Developer Info & Status'
              type='button'
            >
              v{APP_VERSION_SHORT}
            </button>
          </div>
        </div>
      </footer>
      {showFeedbackForm && (
        <FeedbackForm
          onClose={() => {
            setShowFeedbackForm(false);
            setFeedbackPrefillData({});
          }}
          prefillData={feedbackPrefillData}
        />
      )}
      {renderApprovalsInfoModal()}
      {renderPrivacyModal()}
      {renderCloudflareModal()}
      {renderDeveloperModal()}
    </div>
  );
}

export default App;
