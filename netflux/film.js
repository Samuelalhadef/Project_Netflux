// Configuration de base pour l'API TMDB
const CONFIG = {
    // Token d'authentification pour l'API
    authToken: 'Token',
    // URLs de base pour l'API et les images
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
    // Options par défaut pour les requêtes fetch
    defaultOptions: {
        headers: {
            'Authorization': 'APi_Key',
            'Content-Type': 'application/json'
        }
    }
};

// Classe principale pour gérer l'application des séries
class SeriesApp {
    constructor() {
        // État initial de l'application
        this.state = {
            featuredSeries: null,
            sliderPositions: {
                'popular-series': 0,
                'trending-series': 0,
                'top-rated-series': 0,
                'new-series': 0
            }
        };

        // Démarrer l'application une fois le DOM chargé
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeApp();
        });
    }

    // Méthode utilitaire pour faire des requêtes à l'API TMDB
    async fetchFromTMDB(endpoint, params = {}) {
        try {
            // Construire l'URL avec les paramètres
            const queryString = new URLSearchParams({
                language: 'fr-FR',
                ...params
            }).toString();
            
            const url = `${CONFIG.baseUrl}${endpoint}?${queryString}`;
            const response = await fetch(url, CONFIG.defaultOptions);

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
            // Afficher un indicateur de chargement
            this.showLoadingState();

            // Charger toutes les sections en parallèle
            await Promise.all([
                this.loadFeaturedSeries(),
                this.loadAllSeries()
            ]);

            // Initialiser les contrôles des sliders
            this.initializeSliders();

            // Retirer l'indicateur de chargement
            this.hideLoadingState();
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            this.handleError(error);
        }
    }

    // Chargement de toutes les sections de séries
    async loadAllSeries() {
        const sections = [
            { endpoint: '/tv/popular', containerId: 'popular-series' },
            { endpoint: '/trending/tv/week', containerId: 'trending-series' },
            { endpoint: '/tv/top_rated', containerId: 'top-rated-series' },
            { endpoint: '/discover/tv', containerId: 'new-series', params: {
                sort_by: 'first_air_date.desc',
                'first_air_date.lte': new Date().toISOString().split('T')[0],
                'first_air_date.gte': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }}
        ];

        await Promise.all(sections.map(section => 
            this.loadSeriesSection(section.endpoint, section.containerId, section.params)
        ));
    }

    // Chargement de la série mise en avant
    async loadFeaturedSeries() {
        try {
            // Charger les séries populaires
            const { results } = await this.fetchFromTMDB('/tv/popular');
            
            // Sélectionner une série au hasard
            const randomSeries = results[Math.floor(Math.random() * results.length)];
            
            // Charger les détails complets de la série
            const details = await this.fetchFromTMDB(`/tv/${randomSeries.id}`);
            this.state.featuredSeries = { ...randomSeries, ...details };

            // Mettre à jour l'interface
            this.updateFeaturedSeriesUI();
        } catch (error) {
            console.error('Erreur lors du chargement de la série vedette:', error);
            throw error;
        }
    }

    // Mise à jour de l'interface pour la série vedette
    updateFeaturedSeriesUI() {
        const series = this.state.featuredSeries;
        if (!series) return;

        // Mettre à jour l'image de fond
        const featuredElement = document.querySelector('.featured');
        if (featuredElement && series.backdrop_path) {
            featuredElement.style.backgroundImage = 
                `url(${CONFIG.imageBaseUrl}/original${series.backdrop_path})`;
        }

        // Mettre à jour les informations textuelles
        const elements = {
            '.featured-title': series.name,
            '.featured-description': series.overview,
            '.series-rating': `★ ${series.vote_average.toFixed(1)}`,
            '.series-year': series.first_air_date?.split('-')[0] || 'N/A',
            '.series-seasons': `${series.number_of_seasons || 0} saison${series.number_of_seasons > 1 ? 's' : ''}`
        };

        for (const [selector, text] of Object.entries(elements)) {
            const element = document.querySelector(selector);
            if (element) element.textContent = text;
        }
    }

    // Chargement d'une section de séries
    async loadSeriesSection(endpoint, containerId, params = {}) {
        try {
            const data = await this.fetchFromTMDB(endpoint, params);
            const container = document.querySelector(`.${containerId}`);
            
            if (container && data.results) {
                container.innerHTML = data.results
                    .map(series => this.createSeriesCard(series))
                    .join('');
            }
        } catch (error) {
            console.error(`Erreur lors du chargement de la section ${containerId}:`, error);
            throw error;
        }
    }

    // Création d'une carte de série
    createSeriesCard(series) {
        const overview = series.overview?.length > 150 
            ? `${series.overview.substring(0, 150)}...` 
            : series.overview || 'Aucune description disponible';

        return `
            <div class="series-card" data-id="${series.id}">
                <img src="${CONFIG.imageBaseUrl}/w500${series.poster_path}"
                     alt="${series.name}"
                     loading="lazy"
                     onerror="this.src='placeholder.jpg'">
                <div class="series-card-overlay">
                    <div class="series-card-content">
                        <h4>${series.name}</h4>
                        <div class="series-card-info">
                            <span class="rating">★ ${series.vote_average?.toFixed(1) || 'N/A'}</span>
                            <span class="year">${series.first_air_date?.split('-')[0] || 'N/A'}</span>
                        </div>
                        <p class="series-card-overview">${overview}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Gestion des sliders
    initializeSliders() {
        document.querySelectorAll('.slider-container').forEach(container => {
            const slider = container.querySelector('.series-slider');
            const leftArrow = container.querySelector('.arrow-left');
            const rightArrow = container.querySelector('.arrow-right');

            if (slider && leftArrow && rightArrow) {
                leftArrow.addEventListener('click', () => this.handleSliderClick(slider, 'left'));
                rightArrow.addEventListener('click', () => this.handleSliderClick(slider, 'right'));
            }
        });
    }

    // Gestion du clic sur les flèches des sliders
    handleSliderClick(slider, direction) {
        const sliderId = slider.classList[1];
        const containerWidth = slider.parentElement.clientWidth;
        const scrollAmount = containerWidth * 0.75;

        const currentPosition = this.state.sliderPositions[sliderId] || 0;
        const newPosition = direction === 'left'
            ? Math.max(0, currentPosition - scrollAmount)
            : Math.min(slider.scrollWidth - containerWidth, currentPosition + scrollAmount);

        this.state.sliderPositions[sliderId] = newPosition;
        slider.style.transform = `translateX(-${newPosition}px)`;
    }

    // Affichage de l'état de chargement
    showLoadingState() {
        const loading = document.createElement('div');
        loading.className = 'loading-spinner';
        document.querySelector('.series-sections').prepend(loading);
    }

    // Masquage de l'état de chargement
    hideLoadingState() {
        const loading = document.querySelector('.loading-spinner');
        if (loading) loading.remove();
    }

    // Gestion des erreurs
    handleError(error) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Une erreur est survenue lors du chargement du contenu. Veuillez réessayer plus tard.';
        
        const container = document.querySelector('.series-sections');
        const existingError = container.querySelector('.error-message');
        
        if (existingError) {
            existingError.remove();
        }
        
        container.prepend(errorMessage);
        this.hideLoadingState();
    }
}

// Créer une instance de l'application
const app = new SeriesApp();
