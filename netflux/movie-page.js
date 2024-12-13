// Configuration de l'API TMDB
const CONFIG = {
    authToken: 'Token',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p'
};

class MoviePage {
    constructor() {
        this.movieId = this.getMovieIdFromUrl();
        this.initializePage();
    }

    // Récupérer l'ID du film depuis l'URL
    getMovieIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    // Configuration des options pour les requêtes fetch
    get fetchOptions() {
        return {
            headers: {
                'Authorization': `Bearer ${CONFIG.authToken}`,
                'Content-Type': 'application/json'
            }
        };
    }

    // Méthode pour faire des requêtes à l'API
    async fetchFromTMDB(endpoint) {
        try {
            const response = await fetch(`${CONFIG.baseUrl}${endpoint}`, this.fetchOptions);
            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Erreur lors de la requête à ${endpoint}:`, error);
            throw error;
        }
    }

    async initializePage() {
        try {
            // Charger toutes les données nécessaires
            const [movieDetails, credits, similar] = await Promise.all([
                this.fetchFromTMDB(`/movie/${this.movieId}?language=fr-FR`),
                this.fetchFromTMDB(`/movie/${this.movieId}/credits?language=fr-FR`),
                this.fetchFromTMDB(`/movie/${this.movieId}/similar?language=fr-FR`)
            ]);

            // Mettre à jour l'interface avec les données
            this.updateMovieDetails(movieDetails);
            this.updateCredits(credits);
            this.updateSimilarMovies(similar.results.slice(0, 12));

        } catch (error) {
            console.error('Erreur lors du chargement de la page:', error);
            this.handleError(error);
        }
    }

    updateMovieDetails(movie) {
        // Mettre à jour le titre de la page
        document.title = `${movie.title} - Netflix Clone`;

        // Mettre à jour l'arrière-plan
        const backdrop = document.querySelector('.movie-backdrop');
        backdrop.style.backgroundImage = `url(${CONFIG.imageBaseUrl}/original${movie.backdrop_path})`;

        // Mettre à jour les informations principales
        document.querySelector('.movie-title').textContent = movie.title;
        document.querySelector('.poster-img').src = `${CONFIG.imageBaseUrl}/w500${movie.poster_path}`;
        document.querySelector('.poster-img').alt = movie.title;
        document.querySelector('.movie-overview').textContent = movie.overview;

        // Mettre à jour les métadonnées
        document.querySelector('.movie-year').textContent = new Date(movie.release_date).getFullYear();
        document.querySelector('.movie-runtime').textContent = `${movie.runtime} min`;
        document.querySelector('.movie-rating').textContent = `★ ${movie.vote_average.toFixed(1)}`;

        // Mettre à jour les genres
        const genresContainer = document.querySelector('.movie-genres');
        genresContainer.innerHTML = `
            <h3>Genres</h3>
            ${movie.genres.map(genre => `<span>${genre.name}</span>`).join('')}
        `;
    }

    updateCredits(credits) {
        // Mettre à jour le casting
        const cast = credits.cast.slice(0, 5);
        const castContainer = document.querySelector('.movie-cast');
        castContainer.innerHTML = `
            <h3>Casting principal</h3>
            <p>${cast.map(actor => actor.name).join(', ')}</p>
        `;

        // Mettre à jour le réalisateur
        const director = credits.crew.find(person => person.job === 'Director');
        if (director) {
            const directorContainer = document.querySelector('.movie-director');
            directorContainer.innerHTML = `
                <h3>Réalisateur</h3>
                <p>${director.name}</p>
            `;
        }
    }

    updateSimilarMovies(movies) {
        const container = document.querySelector('.movies-grid');
        container.innerHTML = movies.map(movie => this.createMovieCard(movie)).join('');

        // Ajouter les écouteurs d'événements pour la navigation
        container.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => {
                window.location.href = `ufilm.html?id=${card.dataset.id}`;
            });
        });
    }

    createMovieCard(movie) {
        return `
            <div class="movie-card" data-id="${movie.id}">
                <img src="${CONFIG.imageBaseUrl}/w500${movie.poster_path}"
                     alt="${movie.title}"
                     loading="lazy">
                <div class="movie-card-overlay">
                    <h4>${movie.title}</h4>
                    <div class="movie-info">
                        <span class="rating">★ ${movie.vote_average.toFixed(1)}</span>
                        <span class="year">${movie.release_date.split('-')[0]}</span>
                    </div>
                </div>
            </div>
        `;
    }

    handleError(error) {
        const container = document.querySelector('.movie-detail-container');
        container.innerHTML = `
            <div class="error-message" style="padding: 100px 20px; text-align: center;">
                <h2>Une erreur est survenue</h2>
                <p>Impossible de charger les détails du film. Veuillez réessayer plus tard.</p>
                <a href="index.html" class="btn btn-play" style="display: inline-block; margin-top: 20px;">
                    Retour à l'accueil
                </a>
            </div>
        `;
    }
}

// Initialiser la page quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new MoviePage();
});
