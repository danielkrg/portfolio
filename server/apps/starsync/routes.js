import { Router } from 'express';
import axios from 'axios';

const router = Router();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const FRONTEND_URL = process.env.VITE_API_URL;

router.get('/login', (req, res) => {
    const scopes = 'user-top-read';
    res.redirect(
        `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
    );
});

router.get('/checkAuth', (req, res) => {
    if (req.session.accessToken) {
        res.json({ authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});

router.get('/callback', async (req, res) => {
    const code = req.query.code;
    try {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        req.session.accessToken = response.data.access_token;
        console.log(`FRONTEND_URL: ${FRONTEND_URL}`)
        res.redirect(`${FRONTEND_URL}/apps/starsync/dashboard`);
    } catch (error) {
        console.error('Error getting token:', error.response?.data || error.message);
        res.redirect(`${FRONTEND_URL}/apps/starsync/error`);
    }
});

router.get('/userdata', async (req, res) => {
    const accessToken = req.session.accessToken;
    const timeRange = req.query.time_range || 'long_term';
    if (!accessToken) {
        return res.redirect(`${FRONTEND_URL}/apps/starsync/error`);
    }
    try {
        const [profileNameResponse, tracksResponse, artistsResponse, playlistResponse] = await Promise.all([
            axios.get('https://api.spotify.com/v1/me/', {
                headers: { Authorization: `Bearer ${accessToken}` },
            }),
            axios.get('https://api.spotify.com/v1/me/top/tracks', {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { limit: 10, time_range: timeRange },
            }),
            axios.get('https://api.spotify.com/v1/me/top/artists', {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { limit: 10, time_range: timeRange },
            }),
            axios.get('https://api.spotify.com/v1/me/playlists', {
                headers: { Authorization: `Bearer ${accessToken}` },
            }),
        ]);

        res.json({
            displayName: profileNameResponse.data.display_name,
            topTracks: tracksResponse.data.items.map(track => ({
                name: track.name,
                artists: track.artists.map(a => a.name),
                popularity: track.popularity,
                image: track.album.images[0]?.url ?? null,
                link: track.external_urls.spotify,
            })),
            topArtists: artistsResponse.data.items.map(artist => ({
                name: artist.name,
                popularity: Math.round(artist.followers.total / 30000000 * 10000) / 100,
                image: artist.images[0]?.url ?? null,
                genres: artist.genres,
                link: artist.external_urls.spotify,
            })),
            playlists: playlistResponse.data.items.map(p => ({ name: p.name })),
        });
    } catch (error) {
        console.error('Error fetching data:', error.response?.data || error.message);
        res.redirect(`${FRONTEND_URL}/apps/starsync/error`);
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => res.send('Logged out'));
});

export default router;