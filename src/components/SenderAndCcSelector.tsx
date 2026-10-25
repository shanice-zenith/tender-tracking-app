import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  User, 
  Plus, 
  Check, 
  Trash2, 
  X, 
  UserCheck, 
  Pencil, 
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { 
  SenderProfile, 
  DEFAULT_SENDER_PROFILES, 
  getStoredSenderProfiles, 
  saveCustomSenderProfile, 
  updateSenderProfile,
  deleteSenderProfile 
} from '../data/senderProfiles';
import { googleAuthService } from '../services/googleAuthService';

interface SenderAndCcSelectorProps {
  selectedSenderId: string;
  onSelectSenderId: (id: string) => void;
  ccEmails: string;
  onChangeCcEmails: (cc: string) => void;
  accentColor?: 'emerald' | 'amber' | 'blue';
  onProfilesUpdated?: (profiles: SenderProfile[]) => void;
}

export const SenderAndCcSelector: React.FC<SenderAndCcSelectorProps> = ({
  selectedSenderId,
  onSelectSenderId,
  ccEmails,
  onChangeCcEmails,
  accentColor = 'emerald',
  onProfilesUpdated
}) => {
  const [profiles, setProfiles] = useState<SenderProfile[]>(() => getStoredSenderProfiles());
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // State for Edit Modal
  const [editingProfile, setEditingProfile] = useState<SenderProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editError, setEditError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state for creating a new custom sign-off account
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Zenith Project Estimator');
  const [newEmail, setNewEmail] = useState('');
  const [formError, setFormError] = useState('');

  // Reload profiles if storage or window event triggers
  useEffect(() => {
    const handleSync = () => {
      const current = getStoredSenderProfiles();
      setProfiles(current);
    };

    window.addEventListener('zenith_sender_profiles_updated', handleSync);
    window.addEventListener('zenith_auth_state_changed', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('zenith_sender_profiles_updated', handleSync);
      window.removeEventListener('zenith_auth_state_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const currentUser = googleAuthService.getCurrentUser();

  // Auto-select authenticated user's profile if available and not explicitly customized
  useEffect(() => {
    if (currentUser?.email && profiles.length > 0) {
      const userProfile = profiles.find((p) => p.email.toLowerCase() === currentUser.email.toLowerCase());
      if (userProfile && selectedSenderId === 'shanice' && userProfile.id !== 'shanice') {
        onSelectSenderId(userProfile.id);
      }
    }
  }, [currentUser, profiles, selectedSenderId, onSelectSenderId]);

  // Sync selectedSenderId if current selection was deleted
  useEffect(() => {
    if (profiles.length > 0 && !profiles.some((p) => p.id === selectedSenderId)) {
      onSelectSenderId(profiles[0].id);
    }
  }, [profiles, selectedSenderId, onSelectSenderId]);

  const isAmber = accentColor === 'amber';
  const isBlue = accentColor === 'blue';
  const ringFocus = isBlue ? 'focus:ring-blue-500' : isAmber ? 'focus:ring-amber-500' : 'focus:ring-emerald-500';
  const borderActive = isBlue
    ? 'border-blue-500 bg-blue-50/70 text-blue-950 shadow-xs'
    : isAmber 
    ? 'border-amber-500 bg-amber-50/70 text-amber-950 shadow-xs' 
    : 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-xs';
  const badgeActive = isBlue ? 'bg-blue-600 text-white' : isAmber ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white';
  const buttonPrimary = isBlue
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : isAmber 
    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
    : 'bg-emerald-600 hover:bg-emerald-700 text-white';
  const iconColor = isBlue ? 'text-blue-600' : isAmber ? 'text-amber-600' : 'text-emerald-600';

  // Open Edit Modal pre-populated with card details
  const handleOpenEditModal = (profile: SenderProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProfile(profile);
    setEditName(profile.name);
    setEditRole(profile.role || '');
    setEditEmail(profile.email);
    setEditWebsite(profile.website || 'thezenithgroup.ca');
    setEditError('');
    setShowDeleteConfirm(false);
  };

  // Save changes from Edit Modal
  const handleSaveEditedProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    const cleanName = editName.trim();
    const cleanEmail = editEmail.trim();
    const cleanRole = editRole.trim();
    const cleanWebsite = editWebsite.trim() || 'thezenithgroup.ca';

    if (!cleanName) {
      setEditError('Sender name is required.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setEditError('Please enter a valid email address.');
      return;
    }

    const updatedProfile: SenderProfile = {
      ...editingProfile,
      name: cleanName,
      role: cleanRole,
      email: cleanEmail,
      website: cleanWebsite
    };

    const updatedList = updateSenderProfile(updatedProfile);
    setProfiles(updatedList);
    onProfilesUpdated?.(updatedList);

    // Close modal
    setEditingProfile(null);
  };

  // Delete profile from Edit Modal
  const handleDeleteProfile = (id: string) => {
    const updatedList = deleteSenderProfile(id);
    setProfiles(updatedList);
    onProfilesUpdated?.(updatedList);

    if (selectedSenderId === id) {
      if (updatedList.length > 0) {
        onSelectSenderId(updatedList[0].id);
      } else {
        onSelectSenderId(DEFAULT_SENDER_PROFILES[0].id);
      }
    }

    setEditingProfile(null);
    setShowDeleteConfirm(false);
  };

  // Handle saving new custom sign-off account from inline creator
  const handleSaveNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    const cleanEmail = newEmail.trim();
    const cleanRole = newRole.trim() || 'Zenith Project Estimator';

    if (!cleanName) {
      setFormError('Please enter a name for this sign-off account.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    const customId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newProfile: Omit<SenderProfile, 'isCustom'> = {
      id: customId,
      name: cleanName,
      role: cleanRole,
      email: cleanEmail,
      website: 'thezenithgroup.ca'
    };

    const result = saveCustomSenderProfile(newProfile);
    setProfiles(result.profiles);
    onSelectSenderId(result.newProfile.id);
    onProfilesUpdated?.(result.profiles);
    
    // Reset form
    setNewName('');
    setNewRole('Zenith Project Estimator');
    setNewEmail('');
    setFormError('');
    setIsAddingNew(false);
  };

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
      {/* 1. From / Sender Choice */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <User className={`w-4 h-4 ${iconColor}`} />
            <span>Send From / Sign-off Account</span>
          </label>
          <span className="text-[10px] text-slate-400 font-medium">
            Stamped in email signature, header, and mailto protocol
          </span>
        </div>

        {/* Sender Profile Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {profiles.map((profile) => {
            const isSelected = selectedSenderId === profile.id;
            return (
              <div
                key={profile.id}
                onClick={() => {
                  onSelectSenderId(profile.id);
                  setIsAddingNew(false);
                }}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 text-xs relative select-none group ${
                  isSelected 
                    ? `${borderActive} ring-1 ${isAmber ? 'ring-amber-400' : 'ring-emerald-400'}` 
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs'
                }`}
              >
                {/* Card Top Row: Name + Action Buttons */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserCheck className={`w-3.5 h-3.5 shrink-0 ${isSelected ? (isAmber ? 'text-amber-700' : 'text-emerald-700') : 'text-slate-400'}`} />
                    <span className="font-extrabold text-slate-900 truncate">{profile.name}</span>
                    {currentUser && profile.email.toLowerCase() === currentUser.email.toLowerCase() && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5 shrink-0" title="Active Google Account">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Edit Icon Button */}
                    <button
                      type="button"
                      id={`edit-sender-${profile.id}`}
                      onClick={(e) => handleOpenEditModal(profile, e)}
                      className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
                      title="Edit sign-off profile details"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    {/* Active Selected Check Badge */}
                    {isSelected && (
                      <span className={`p-0.5 rounded-full ${badgeActive} shrink-0`}>
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Details: Role & Email */}
                <div className="space-y-0.5 min-h-[32px]">
                  {profile.role ? (
                    <span className="text-[11px] font-medium text-slate-500 block truncate">
                      {profile.role}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400 italic block truncate">
                      No title specified
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-slate-700 font-semibold block truncate">
                    {profile.email}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Account Creation Button / Form */}
        <div className="pt-1">
          {!isAddingNew ? (
            <button
              type="button"
              id="add-sign-off-account-btn"
              onClick={() => setIsAddingNew(true)}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl text-left text-xs text-slate-700 font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              <span>+ Add Sign-off Account</span>
            </button>
          ) : (
            <form 
              onSubmit={handleSaveNewAccount}
              className="p-3.5 bg-white border border-slate-300 rounded-xl space-y-3 shadow-xs animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Plus className={`w-3.5 h-3.5 ${iconColor}`} />
                  <span>Create & Save Sign-off Account</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setFormError('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Sign-off Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah, Marcus"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setFormError('');
                    }}
                    className={`w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${ringFocus}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Title / Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Zenith Project Estimator"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className={`w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${ringFocus}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Zenith Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="name@thezenithgroup.ca"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      setFormError('');
                    }}
                    className={`w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${ringFocus}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setFormError('');
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold ${buttonPrimary} transition-all shadow-xs cursor-pointer flex items-center gap-1.5`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Sign-off Account</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 2. CC Recipients Field */}
      <div className="space-y-1.5 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-600" />
            <span>CC Team & Collaborators (Optional)</span>
          </label>
          <span className="text-[10px] text-slate-400">Separate multiple emails with commas or semicolons</span>
        </div>
        <input
          type="text"
          placeholder="e.g. pm@thezenithgroup.ca, estimator@thezenithgroup.ca"
          value={ccEmails}
          onChange={(e) => onChangeCcEmails(e.target.value)}
          className={`w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 ${ringFocus}`}
        />
        <p className="text-[10px] text-slate-500">
          CC recipients will receive visible copies of this tender dispatch alongside the audit record.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* EDIT SIGN-OFF PROFILE MODAL */}
      {/* ========================================================================= */}
      {editingProfile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingProfile(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${isAmber ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Edit Sign-off Profile</h3>
                  <p className="text-[11px] text-slate-500">Update sender name, title, and contact details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditedProfile} className="p-5 space-y-4">
              {editError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Sender Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Sender Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setEditError('');
                  }}
                  placeholder="e.g. Shanice, Nadia"
                  className={`w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${ringFocus}`}
                  autoFocus
                />
                <p className="text-[10px] text-slate-400">
                  Displayed in email signature, header greeting, and mail client header
                </p>
              </div>

              {/* Title / Role */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Title / Role
                  </label>
                  <span className="text-[10px] text-slate-400">Editable or clearable</span>
                </div>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="e.g. Zenith Project Estimator (or leave blank)"
                  className={`w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${ringFocus}`}
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => {
                    setEditEmail(e.target.value);
                    setEditError('');
                  }}
                  placeholder="name@thezenithgroup.ca"
                  className={`w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${ringFocus}`}
                />
                <p className="text-[10px] text-slate-400">
                  Used as the primary sender email in signature and mailto link
                </p>
              </div>

              {/* Website */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Company Website
                </label>
                <input
                  type="text"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="thezenithgroup.ca"
                  className={`w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${ringFocus}`}
                />
              </div>

              {/* Delete Confirmation Warning Block */}
              {showDeleteConfirm && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Delete this sign-off profile?</span>
                  </div>
                  <p className="text-[11px] text-rose-800">
                    Are you sure you want to permanently delete <strong>{editingProfile.name}</strong> ({editingProfile.email})? This action cannot be undone.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProfile(editingProfile.id)}
                      className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Profile</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProfile(null)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold ${buttonPrimary} transition-all shadow-xs cursor-pointer flex items-center gap-1.5`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
