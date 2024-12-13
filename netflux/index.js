// Configuration de base de l'application
const CONFIG = {
    // Informations d'authentification pour l'API TMDB
    authToken: 'Token',
    
    // URLs de base pour l'API et les images
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
    
    // Endpoints pour les différentes sections
    endpoints: {
        popular: '/movie/popular',
        trending: '/trending/movie/week',
        topRated: '/movie/top_rated'
    }
};

// Classe principale pour gérer l'application Netflix
class NetflixApp {
    constructor() {
        // Initialisation des propriétés de l'application
        this.featuredMovie = null;
        this.currentSliderPositions = {
            'popular-movies': 0,
            'trending-movies': 0,
            'top-rated-movies': 0
        };
        
        // Options par défaut pour les requêtes fetch
        this.fetchOptions = {
            headers: {
                'Authorization': `Bearer ${CONFIG.authToken}`,
                'Content-Type': 'application/json'
            }
        };

        // Démarrer l'application
        this.initializeApp();
    }

    // Méthode utilitaire pour faire des requêtes à l'API
    async fetchFromTMDB(endpoint, params = '') {
        try {
            const response = await fetch(
                `${CONFIG.baseUrl}${endpoint}?language=fr-FR${params}`, 
                this.fetchOptions
            );
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Erreur lors de la requête à ${endpoint}:`, error);
            throw error;
        }
    }

    // Initialisation de l'application
    async initializeApp() {
        try {
            // Chargement parallèle de toutes les sections
            await Promise.all([
                this.loadFeaturedMovie(),
                this.loadMovieSection(CONFIG.endpoints.popular, 'popular-movies'),
                this.loadMovieSection(CONFIG.endpoints.trending, 'trending-movies'),
                this.loadMovieSection(CONFIG.endpoints.topRated, 'top-rated-movies')
            ]);

            // Initialisation des contrôles de slider après le chargement du contenu
            this.initializeSliders();
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de l\'application:', error);
            this.handleError('Une erreur est survenue lors du chargement de l\'application');
        }
    }

    // Chargement et affichage du film en vedette
    async loadFeaturedMovie() {
        try {
            // Récupération d'un film populaire aléatoire
            const data = await this.fetchFromTMDB(CONFIG.endpoints.popular);
            this.featuredMovie = data.results[Math.floor(Math.random() * data.results.length)];

            // Chargement des détails supplémentaires du film
            const movieDetails = await this.fetchFromTMDB(`/movie/${this.featuredMovie.id}`);

            // Mise à jour de l'interface pour le film en vedette
            this.updateFeaturedMovieUI(this.featuredMovie, movieDetails);
        } catch (error) {
            console.error('Erreur lors du chargement du film vedette:', error);
            this.handleError('Impossible de charger le film vedette');
        }
    }

    // Mise à jour de l'interface pour le film en vedette
    updateFeaturedMovieUI(movie, details) {
        // Mise à jour de l'arrière-plan
        const featuredElement = document.querySelector('.featured');
        if (featuredElement) {
            featuredElement.style.backgroundImage = 
                `url(${CONFIG.imageBaseUrl}/original${movie.backdrop_path})`;
        }

        // Mise à jour du titre
        const titleElement = document.querySelector('.featured-title');
        if (titleElement) {
            titleElement.textContent = movie.title;
        }

        // Mise à jour de la description
        const descriptionElement = document.querySelector('.featured-description');
        if (descriptionElement) {
            const description = `${movie.overview}\n\nGenres: ${
                details.genres.map(genre => genre.name).join(', ')
            }`;
            
            descriptionElement.textContent = 
                description.length > 300 ? description.substring(0, 300) + '...' : description;
        }
    }

    // Chargement d'une section de films
    async loadMovieSection(endpoint, containerId) {
        try {
            const data = await this.fetchFromTMDB(endpoint);
            const container = document.querySelector(`.${containerId}`);
            
            if (!container) {
                throw new Error(`Conteneur ${containerId} non trouvé`);
            }

            // Création et insertion des cartes de films
            const movieCards = await Promise.all(
                data.results.map(async (movie) => {
                    const details = await this.fetchFromTMDB(`/movie/${movie.id}`);
                    return this.createMovieCard(movie, details);
                })
            );

            container.innerHTML = movieCards.join('');
            
            // Ajout des écouteurs d'événements pour la navigation
            this.addMovieCardListeners(container);
        } catch (error) {
            console.error(`Erreur lors du chargement de la section ${endpoint}:`, error);
            this.handleError(`Impossible de charger la section de films ${containerId}`);
        }
    }

    // Création d'une carte de film
    createMovieCard(movie, details) {
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
                    <p class="movie-overview">
                        ${movie.overview.length > 100 
                          ? movie.overview.substring(0, 100) + '...' 
                          : movie.overview}
                    </p>
                </div>
            </div>
        `;
    }

    // Ajout des écouteurs d'événements pour la navigation
    addMovieCardListeners(container) {
        container.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => {
                window.location.href = `ufilm.html?id=${card.dataset.id}`;
            });
        });
    }

    // Initialisation des contrôles de slider
    initializeSliders() {
        document.querySelectorAll('.slider-container').forEach(container => {
            const slider = container.querySelector('.movies-slider');
            const leftArrow = container.querySelector('.arrow-left');
            const rightArrow = container.querySelector('.arrow-right');

            if (slider && leftArrow && rightArrow) {
                leftArrow.addEventListener('click', () => 
                    this.handleSliderClick(slider, 'left'));
                rightArrow.addEventListener('click', () => 
                    this.handleSliderClick(slider, 'right'));
            }
        });
    }

    // Gestion du défilement des sliders
    handleSliderClick(slider, direction) {
        const sliderId = slider.classList[1];
        const containerWidth = slider.parentElement.clientWidth;
        const scrollAmount = containerWidth * 0.75; // Défilement de 75% de la largeur

        if (direction === 'left') {
            this.currentSliderPositions[sliderId] = Math.max(
                0,
                this.currentSliderPositions[sliderId] - scrollAmount
            );
        } else {
            const maxScroll = slider.scrollWidth - containerWidth;
            this.currentSliderPositions[sliderId] = Math.min(
                maxScroll,
                this.currentSliderPositions[sliderId] + scrollAmount
            );
        }

        // Application de la translation avec une animation fluide
        slider.style.transform = `translateX(-${this.currentSliderPositions[sliderId]}px)`;
    }

    // Gestion globale des erreurs
    handleError(message) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = `
            <div class="error-content">
                <h3>Erreur</h3>
                <p>${message}</p>
                <button onclick="window.location.reload()">Réessayer</button>
            </div>
        `;
        
        // Insertion du message d'erreur dans le document
        const container = document.querySelector('.movies-sections');
        if (container) {
            container.prepend(errorMessage);
        }
    }
}

// Démarrage de l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new NetflixApp();
});
