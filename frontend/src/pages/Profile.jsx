// src/pages/Profile.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks/useProfile';

const Profile = () => {
    const { user, logout } = useAuth();
    const { profile, loading, error, updateProfile } = useProfile();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        bio: user?.profile?.bio || '',
        location: user?.profile?.location || '',
        website: user?.profile?.website || '',
        twitter_handle: user?.profile?.twitter_handle || '',
        linkedin_url: user?.profile?.linkedin_url || ''
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    Error loading profile: {error}
                </div>
            </div>
        );
    }

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaveError('');

        try {
            await updateProfile(formData);
            setIsEditing(false);
        } catch (err) {
            setSaveError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            {/* Profile Header */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-32"></div>

                <div className="px-6 py-4 relative">
                    <div className="sm:flex sm:items-end sm:justify-between">
                        <div className="sm:flex sm:space-x-5">
                            <div className="flex-shrink-0">
                                {user?.profile?.avatar_url ? (
                                    <img
                                        className="h-24 w-24 rounded-full ring-4 ring-white -mt-12"
                                        src={user.profile.avatar_url}
                                        alt={user.username}
                                    />
                                ) : (
                                    <div className="h-24 w-24 rounded-full ring-4 ring-white -mt-12 bg-gray-300 flex items-center justify-center text-3xl font-bold text-gray-600">
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 sm:mt-0 sm:pt-1">
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {user?.full_name || user?.username}
                                </h1>
                                <p className="text-sm text-gray-500">@{user?.username}</p>
                                {user?.profile?.location && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        📍 {user.profile.location}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-0 flex space-x-3">
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                {isEditing ? 'Cancel' : 'Edit Profile'}
                            </button>
                            <button
                                onClick={logout}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Content */}
            <div className="mt-8">
                {isEditing ? (
                    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Profile</h2>

                        {saveError && (
                            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                {saveError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Bio
                                </label>
                                <textarea
                                    name="bio"
                                    rows="4"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Website
                                </label>
                                <input
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Twitter Handle
                                </label>
                                <input
                                    type="text"
                                    name="twitter_handle"
                                    value={formData.twitter_handle}
                                    onChange={handleInputChange}
                                    placeholder="@username"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    LinkedIn URL
                                </label>
                                <input
                                    type="url"
                                    name="linkedin_url"
                                    value={formData.linkedin_url}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>

                        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {user?.full_name || 'Not provided'}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm font-medium text-gray-500">Email</dt>
                                <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
                                {user?.profile?.email_verified ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                                        Verified
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                                        Not Verified
                                    </span>
                                )}
                            </div>

                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">Bio</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {user?.profile?.bio || 'No bio provided'}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm font-medium text-gray-500">Location</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {user?.profile?.location || 'Not provided'}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm font-medium text-gray-500">Website</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {user?.profile?.website ? (
                                        <a
                                            href={user.profile.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            {user.profile.website}
                                        </a>
                                    ) : 'Not provided'}
                                </dd>
                            </div>

                            {user?.profile?.github_username && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">GitHub</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        <a
                                            href={user.profile.github_url || `https://github.com/${user.profile.github_username}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            @{user.profile.github_username}
                                        </a>
                                    </dd>
                                </div>
                            )}

                            {user?.profile?.twitter_handle && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Twitter</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        <a
                                            href={`https://twitter.com/${user.profile.twitter_handle.replace('@', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            {user.profile.twitter_handle}
                                        </a>
                                    </dd>
                                </div>
                            )}

                            {user?.profile?.linkedin_url && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        <a
                                            href={user.profile.linkedin_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            Profile
                                        </a>
                                    </dd>
                                </div>
                            )}

                            <div>
                                <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {new Date(user?.profile?.created_at).toLocaleDateString()}
                                </dd>
                            </div>
                        </dl>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;