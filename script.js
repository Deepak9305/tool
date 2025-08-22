document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-btn');
    const resultsContainer = document.getElementById('results');
    const savedContainer = document.getElementById('saved-results');
    const resultsTitle = document.getElementById('results-title');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const instructions = document.getElementById('instructions');
    const noResultsElement = document.getElementById('no-results');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const tvmazeStatus = document.getElementById('tvmaze-status');
    const moviesapiStatus = document.getElementById('moviesapi-status');
    const bubbles = document.querySelectorAll('.bubble');
    const toast = document.getElementById('toast');
    const autocomplete = document.getElementById('autocomplete');
    const loadMoreBtn = document.getElementById('load-more');
    const viewResultsBtn = document.getElementById('view-results');
    const viewSavedBtn = document.getElementById('view-saved');
    const resultsSection = document.getElementById('results-section');
    const savedSection = document.getElementById('saved-section');
    const toggleFiltersBtn = document.getElementById('toggle-filters');
    const advancedFilters = document.getElementById('advanced-filters');
    const yearFilter = document.getElementById('year-filter');
    const ratingFilter = document.getElementById('rating-filter');
    const streamingFilter = document.getElementById('streaming-filter');
    
    // API URLs
    const TVMAZE_API_URL = 'https://api.tvmaze.com/';
    const TMDB_API_URL = 'https://api.themoviedb.org/3';
    const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb'; // Note: In production, this should be secured
    
    const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/300x450/2D3047/8B8BA0?text=No+Image';
    
    // Genre mappings for API calls
    const genreMappings = {
        'popular': {tvmaze: '', tmdb: ''},
        'comedy': {tvmaze: 'comedy', tmdb: '35'},
        'action': {tvmaze: 'action', tmdb: '28'},
        'drama': {tvmaze: 'drama', tmdb: '18'},
        'sci-fi': {tvmaze: 'science-fiction', tmdb: '878'},
        'thriller': {tvmaze: 'thriller', tmdb: '53'}
    };
    
    // Streaming service mappings
    const streamingServices = {
        'netflix': 'Netflix',
        'hulu': 'Hulu',
        'prime': 'Amazon Prime',
        'disney': 'Disney+',
        'hbo': 'HBO Max'
    };
    
    // Autocomplete suggestions
    const autocompleteSuggestions = [
        "Comedy movies",
        "Action TV shows",
        "Drama series",
        "Sci-fi movies",
        "Thriller films",
        "Popular now",
        "Highly rated",
        "New releases",
        "Award winners",
        "Classic films",
        "Binge-worthy shows",
        "Family friendly",
        "Documentaries",
        "Animated series",
        "Crime dramas",
        "Fantasy series",
        "Romantic comedies",
        "Horror movies",
        "Independent films",
        "British series"
    ];
    
    let currentResults = [];
    let activeFilter = 'all';
    let usedIds = new Set(); // Track used IDs to prevent duplicates
    let savedItems = JSON.parse(localStorage.getItem('savedBingeItems')) || [];
    let currentPage = 1;
    let currentQuery = '';
    let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
    let recentlyShownItems = JSON.parse(localStorage.getItem('recentlyShownItems')) || [];
    
    // Show toast notification
    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Show/hide clear button based on input
    searchInput.addEventListener('input', function() {
        clearBtn.style.display = this.value ? 'block' : 'none';
        updateAutocomplete(this.value);
    });
    
    // Update autocomplete suggestions
    function updateAutocomplete(query) {
        if (!query) {
            autocomplete.style.display = 'none';
            return;
        }
        
        const filteredSuggestions = autocompleteSuggestions.filter(suggestion => 
            suggestion.toLowerCase().includes(query.toLowerCase())
        );
        
        if (filteredSuggestions.length === 0) {
            autocomplete.style.display = 'none';
            return;
        }
        
        autocomplete.innerHTML = '';
        filteredSuggestions.slice(0, 5).forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = suggestion;
            item.tabIndex = 0;
            
            item.addEventListener('click', () => {
                searchInput.value = suggestion;
                autocomplete.style.display = 'none';
                searchInput.focus();
            });
            
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    searchInput.value = suggestion;
                    autocomplete.style.display = 'none';
                    searchInput.focus();
                }
            });
            
            autocomplete.appendChild(item);
        });
        
        autocomplete.style.display = 'block';
    }
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !autocomplete.contains(e.target)) {
            autocomplete.style.display = 'none';
        }
    });
    
    // Clear search input
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        searchInput.focus();
        autocomplete.style.display = 'none';
        showToast('Search cleared', 'success');
    });
    
    // Lazy load images
    function lazyLoadImages() {
        const images = document.querySelectorAll('.poster:not(.loaded)');
        
        images.forEach(img => {
            if (img.getAttribute('data-src')) {
                img.setAttribute('src', img.getAttribute('data-src'));
                img.removeAttribute('data-src');
            }
            
            img.onload = function() {
                this.classList.add('loaded');
            };
            
            // Fallback if image fails to load
            img.onerror = function() {
                this.src = PLACEHOLDER_IMAGE;
                this.classList.add('loaded');
            };
        });
    }
    
    // Function to search APIs
    async function searchEntertainment(query, page = 1) {
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        noResultsElement.style.display = 'none';
        
        if (page === 1) {
            resultsContainer.innerHTML = '';
            usedIds.clear(); // Reset used IDs
        }
        
        // Update bubbles active state
        bubbles.forEach(bubble => {
            if (bubble.dataset.search === query) {
                bubble.classList.add('active');
                bubble.setAttribute('aria-pressed', 'true');
            } else {
                bubble.classList.remove('active');
                bubble.setAttribute('aria-pressed', 'false');
            }
        });
        
        try {
            if (page === 1) {
                currentResults = [];
            }
            
            // Update results title
            resultsTitle.textContent = `Results for "${query}"`;
            currentQuery = query;
            currentPage = page;
            
            // Get genre mapping
            const genre = genreMappings[query] || {};
            
            // Search TVmaze API for TV shows
            try {
                tvmazeStatus.className = 'status-dot status-loading';
                let tvmazeUrl = `${TVMAZE_API_URL}shows`;
                const params = [];
                
                if (genre.tvmaze) {
                    params.push(`genres=${genre.tvmaze}`);
                }
                
                if (params.length > 0) {
                    tvmazeUrl += `?${params.join('&')}`;
                }
                
                const tvmazeResponse = await fetch(tvmazeUrl);
                if (tvmazeResponse.ok) {
                    const tvmazeData = await tvmazeResponse.json();
                    
                    // Process TVmaze results
                    if (tvmazeData && tvmazeData.length > 0) {
                        // Get random shows, filtering out recently shown ones
                        const availableShows = tvmazeData.filter(show => 
                            !recentlyShownItems.includes(`tv-${show.id}`)
                        );
                        
                        // If we don't have enough shows, reset the recently shown list
                        if (availableShows.length < 6) {
                            recentlyShownItems = recentlyShownItems.filter(id => !id.startsWith('tv-'));
                            showToast('Resetting TV show history to show more variety', 'success');
                        }
                        
                        const randomShows = getRandomItems(availableShows.length > 0 ? availableShows : tvmazeData, 6);
                        
                        for (const show of randomShows) {
                            if (!usedIds.has(`tv-${show.id}`)) {
                                currentResults.push({
                                    type: 'tvmaze',
                                    data: {
                                        id: `tv-${show.id}`,
                                        title: show.name,
                                        year: show.premiered ? new Date(show.premiered).getFullYear() : 'N/A',
                                        endYear: show.ended ? new Date(show.ended).getFullYear() : null,
                                        poster: show.image ? show.image.medium : PLACEHOLDER_IMAGE,
                                        rating: show.rating ? show.rating.average : 'N/A',
                                        plot: show.summary ? show.summary.replace(/<[^>]*>/g, '') : 'No description available',
                                        type: 'tv',
                                        country: show.network ? show.network.country.code : 'Unknown',
                                        bingeScore: Math.floor(Math.random() * 20) + 75 // Random binge score between 75-95
                                    }
                                });
                                usedIds.add(`tv-${show.id}`);
                                recentlyShownItems.push(`tv-${show.id}`);
                            }
                        }
                        tvmazeStatus.className = 'status-dot status-online';
                        showToast(`Found ${randomShows.length} TV shows`, 'success');
                    } else {
                        console.log('No results from TVmaze');
                        tvmazeStatus.className = 'status-dot status-offline';
                    }
                } else {
                    throw new Error('TVmaze API error');
                }
            } catch (tvmazeError) {
                console.error('TVmaze API error:', tvmazeError);
                tvmazeStatus.className = 'status-dot status-offline';
                showToast('TVmaze API is temporarily unavailable', 'error');
            }
            
            // Search for movies using TMDB API - get completely random movies
            try {
                moviesapiStatus.className = 'status-dot status-loading';
                
                // Get a random page to ensure variety
                const randomPage = Math.floor(Math.random() * 100) + 1;
                let moviesUrl = `${TMDB_API_URL}/discover/movie?api_key=${TMDB_API_KEY}&page=${randomPage}`;
                
                if (genre.tmdb) {
                    moviesUrl += `&with_genres=${genre.tmdb}`;
                }
                
                // Apply advanced filters if set
                const yearValue = yearFilter.value;
                if (yearValue) {
                    if (yearValue.includes('-')) {
                        const [start, end] = yearValue.split('-');
                        moviesUrl += `&primary_release_date.gte=${start}-01-01&primary_release_date.lte=${end}-12-31`;
                    } else if (yearValue === 'before-1990') {
                        moviesUrl += '&primary_release_date.lte=1989-12-31';
                    } else {
                        moviesUrl += `&primary_release_year=${yearValue}`;
                    }
                }
                
                const ratingValue = ratingFilter.value;
                if (ratingValue > 0) {
                    moviesUrl += `&vote_average.gte=${ratingValue}`;
                }
                
                // Sort by popularity to get a mix of ratings
                moviesUrl += '&sort_by=popularity.desc';
                
                const moviesResponse = await fetch(moviesUrl);
                if (moviesResponse.ok) {
                    const moviesData = await moviesResponse.json();
                    
                    // Process movies results
                    if (moviesData && moviesData.results && moviesData.results.length > 0) {
                        // Filter out recently shown movies
                        const availableMovies = moviesData.results.filter(movie => 
                            !recentlyShownItems.includes(`movie-${movie.id}`)
                        );
                        
                        // If we don't have enough movies, reset the recently shown list
                        if (availableMovies.length < 6) {
                            recentlyShownItems = recentlyShownItems.filter(id => !id.startsWith('movie-'));
                            showToast('Resetting movie history to show more variety', 'success');
                        }
                        
                        const moviesToShow = availableMovies.length > 0 ? availableMovies : moviesData.results;
                        
                        for (const item of getRandomItems(moviesToShow, 6)) {
                            if (!usedIds.has(`movie-${item.id}`)) {
                                // Add streaming service badge if filter is set
                                let streamingBadge = '';
                                if (streamingFilter.value) {
                                    streamingBadge = `<span class="streaming-badge ${streamingFilter.value}">${streamingServices[streamingFilter.value]}</span>`;
                                }
                                
                                currentResults.push({
                                    type: 'tmdb',
                                    data: {
                                        id: `movie-${item.id}`,
                                        title: item.title,
                                        year: item.release_date ? new Date(item.release_date).getFullYear() : 'N/A',
                                        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : PLACEHOLDER_IMAGE,
                                        rating: item.vote_average ? item.vote_average : 'N/A',
                                        plot: item.overview ? item.overview : 'No description available',
                                        type: 'movie',
                                        country: item.original_language ? item.original_language.toUpperCase() : 'Unknown',
                                        bingeScore: Math.floor(Math.random() * 20) + 75, // Random binge score between 75-95
                                        streaming: streamingBadge
                                    }
                                });
                                usedIds.add(`movie-${item.id}`);
                                recentlyShownItems.push(`movie-${item.id}`);
                            }
                        }
                        moviesapiStatus.className = 'status-dot status-online';
                        
                        // Show load more button if there are more pages
                        loadMoreBtn.style.display = 'block';
                        
                        showToast(`Found ${moviesData.results.length} movies`, 'success');
                    } else {
                        console.log('No results from TMDB API');
                        moviesapiStatus.className = 'status-dot status-offline';
                        loadMoreBtn.style.display = 'none';
                    }
                } else {
                    throw new Error('TMDB API error');
                }
            } catch (moviesError) {
                console.error('TMDB API error:', moviesError);
                moviesapiStatus.className = 'status-dot status-offline';
                loadMoreBtn.style.display = 'none';
                showToast('Movies API is temporarily unavailable', 'error');
            }
            
            // Store recently shown items in localStorage (keep only last 50)
            if (recentlyShownItems.length > 50) {
                recentlyShownItems = recentlyShownItems.slice(recentlyShownItems.length - 50);
            }
            localStorage.setItem('recentlyShownItems', JSON.stringify(recentlyShownItems));
            
            if (currentResults.length > 0) {
                displayResults(currentResults);
            } else {
                noResultsElement.style.display = 'block';
                resultsTitle.textContent = 'No Results Found';
                showToast('No results found for your search', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            errorElement.style.display = 'block';
            showToast('An error occurred during search', 'error');
        } finally {
            loadingElement.style.display = 'none';
            instructions.style.display = 'none';
            
            // Lazy load images after a short delay
            setTimeout(lazyLoadImages, 100);
        }
    }
    
    // Helper function to get random items from array
    function getRandomItems(array, count) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    
    // Function to display results
    function displayResults(results) {
        const filteredResults = results.filter(item => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'movie') return item.data.type === 'movie';
            if (activeFilter === 'tv') return item.data.type === 'tv';
            if (activeFilter === 'high-rated') return item.data.rating >= 8.0;
            return true;
        });
        
        if (filteredResults.length === 0) {
            noResultsElement.style.display = 'block';
            resultsTitle.textContent = 'No Matching Results';
            return;
        }
        
        filteredResults.forEach((item, index) => {
            // Skip if already displayed (for pagination)
            if (document.getElementById(`card-${item.data.id}`)) {
                return;
            }
            
            const card = document.createElement('div');
            card.classList.add('card');
            card.style.animationDelay = `${index * 0.1}s`;
            card.setAttribute('role', 'listitem');
            card.id = `card-${item.data.id}`;
            
            const data = item.data;
            const title = data.title || 'Unknown Title';
            const year = data.endYear ? `${data.year}-${data.endYear}` : data.year;
            const image = data.poster || PLACEHOLDER_IMAGE;
            const plot = data.plot || 'No description available';
            const rating = data.rating !== 'N/A' ? data.rating : 'N/A';
            const type = data.type || 'tv';
            const country = data.country || 'Unknown';
            const bingeScore = data.bingeScore || Math.floor(Math.random() * 20) + 75;
            const streamingBadge = data.streaming || '';
            
            // Check if item is saved
            const isSaved = savedItems.some(savedItem => savedItem.id === data.id);
            
            // Shorten plot if too long
            const shortenedPlot = plot.length > 120 ? plot.substring(0, 120) + '...' : plot;
            
            card.innerHTML = `
                <div class="card-header">
                    <button class="save-btn ${isSaved ? 'saved' : ''}" data-id="${data.id}" data-type="${type}" aria-label="${isSaved ? 'Remove from saved' : 'Save for later'}">
                        <i class="fas ${isSaved ? 'fa-bookmark' : 'fa-bookmark-o'}"></i>
                    </button>
                    <img data-src="${image}" alt="${title}" class="poster" src="${PLACEHOLDER_IMAGE}">
                    <span class="type-badge ${type === 'movie' ? 'movie-type' : 'tv-type'}">${type === 'movie' ? 'Movie' : 'TV Show'}</span>
                </div>
                <div class="info">
                    <h2 class="title">${title} ${streamingBadge}</h2>
                    <p class="year">${year} • ${country}</p>
                    <p class="plot">${shortenedPlot}</p>
                    <div class="binge-meter">
                        <div class="binge-meter-fill" style="width: ${bingeScore}%"></div>
                    </div>
                    <div class="details">
                        <span>Binge Score: ${bingeScore}%</span>
                        <span class="rating"><i class="fas fa-star"></i> ${rating}</span>
                    </div>
                </div>
            `;
            
            resultsContainer.appendChild(card);
            
            // Add event listener to save button
            const saveBtn = card.querySelector('.save-btn');
            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSaveItem(data);
            });
        });
    }
    
    // Toggle save item
    function toggleSaveItem(item) {
        const index = savedItems.findIndex(savedItem => savedItem.id === item.id);
        
        if (index === -1) {
            // Item not saved, add it
            savedItems.push(item);
            showToast(`"${item.title}" saved for later`, 'success');
        } else {
            // Item already saved, remove it
            savedItems.splice(index, 1);
            showToast(`"${item.title}" removed from saved`, 'success');
        }
        
        // Update localStorage
        localStorage.setItem('savedBingeItems', JSON.stringify(savedItems));
        
        // Update UI
        updateSaveButtons();
        displaySavedItems();
    }
    
    // Update save buttons state
    function updateSaveButtons() {
        document.querySelectorAll('.save-btn').forEach(btn => {
            const id = btn.dataset.id;
            const isSaved = savedItems.some(item => item.id === id);
            
            if (isSaved) {
                btn.classList.add('saved');
                btn.innerHTML = '<i class="fas fa-bookmark"></i>';
                btn.setAttribute('aria-label', 'Remove from saved');
            } else {
                btn.classList.remove('saved');
                btn.innerHTML = '<i class="fas fa-bookmark-o"></i>';
                btn.setAttribute('aria-label', 'Save for later');
            }
        });
    }
    
    // Display saved items
    function displaySavedItems() {
        savedContainer.innerHTML = '';
        
        if (savedItems.length === 0) {
            savedContainer.innerHTML = `
                <div class="no-results" style="display: block;">
                    <i class="fas fa-bookmark" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                    <h3>No saved items yet</h3>
                    <p>Save shows and movies to watch them later</p>
                </div>
            `;
            return;
        }
        
        savedItems.forEach((item, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.style.animationDelay = `${index * 0.1}s`;
            card.setAttribute('role', 'listitem');
            
            const title = item.title || 'Unknown Title';
            const year = item.endYear ? `${item.year}-${item.endYear}` : item.year;
            const image = item.poster || PLACEHOLDER_IMAGE;
            const plot = item.plot || 'No description available';
            const rating = item.rating !== 'N/A' ? item.rating : 'N/A';
            const type = item.type || 'tv';
            const country = item.country || 'Unknown';
            const bingeScore = item.bingeScore || Math.floor(Math.random() * 20) + 75;
            const streamingBadge = item.streaming || '';
            
            // Shorten plot if too long
            const shortenedPlot = plot.length > 120 ? plot.substring(0, 120) + '...' : plot;
            
            card.innerHTML = `
                <div class="card-header">
                    <button class="save-btn saved" data-id="${item.id}" data-type="${type}" aria-label="Remove from saved">
                        <i class="fas fa-bookmark"></i>
                    </button>
                    <img data-src="${image}" alt="${title}" class="poster" src="${PLACEHOLDER_IMAGE}">
                    <span class="type-badge ${type === 'movie' ? 'movie-type' : 'tv-type'}">${type === 'movie' ? 'Movie' : 'TV Show'}</span>
                </div>
                <div class="info">
                    <h2 class="title">${title} ${streamingBadge}</h2>
                    <p class="year">${year} • ${country}</p>
                    <p class="plot">${shortenedPlot}</p>
                    <div class="binge-meter">
                        <div class="binge-meter-fill" style="width: ${bingeScore}%"></div>
                    </div>
                    <div class="details">
                        <span>Binge Score: ${bingeScore}%</span>
                        <span class="rating"><i class="fas fa-star"></i> ${rating}</span>
                    </div>
                </div>
            `;
            
            savedContainer.appendChild(card);
            
            // Add event listener to save button
            const saveBtn = card.querySelector('.save-btn');
            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSaveItem(item);
            });
        });
        
        // Lazy load images
        setTimeout(lazyLoadImages, 100);
    }
    
    // Update filter button accessibility attributes
    function updateFilterButtons() {
        filterButtons.forEach(button => {
            if (button.dataset.type === activeFilter) {
                button.setAttribute('aria-pressed', 'true');
            } else {
                button.setAttribute('aria-pressed', 'false');
            }
        });
    }
    
    // Event listeners
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim().toLowerCase();
        if (query.length > 0) {
            searchEntertainment(query);
        } else {
            showToast('Please enter a search term', 'error');
            searchInput.focus();
        }
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim().toLowerCase();
            if (query.length > 0) {
                searchEntertainment(query);
            } else {
                showToast('Please enter a search term', 'error');
                searchInput.focus();
                autocomplete.style.display = 'none';
                e.preventDefault();
                return false;
            }
        }
    });
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeFilter = button.dataset.type;
            updateFilterButtons();
            
            if (currentResults.length > 0) {
                displayResults(currentResults);
                showToast(`Filtered by ${activeFilter}`, 'success');
            }
        });
        
        // Add keyboard support for filter buttons
        button.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                button.click();
                e.preventDefault();
            }
        });
    });
    
    // Add event listeners to recommendation bubbles
    bubbles.forEach(bubble => {
        bubble.addEventListener('click', () => {
            const searchTerm = bubble.dataset.search;
            searchInput.value = bubble.textContent;
            searchEntertainment(searchTerm);
        });
        
        // Add keyboard support for bubbles
        bubble.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                bubble.click();
                e.preventDefault();
            }
        });
    });
    
    // Load more button
    loadMoreBtn.addEventListener('click', () => {
        searchEntertainment(currentQuery, currentPage + 1);
    });
    
    // View toggle
    viewResultsBtn.addEventListener('click', () => {
        viewResultsBtn.classList.add('active');
        viewSavedBtn.classList.remove('active');
        resultsSection.style.display = 'block';
        savedSection.classList.remove('visible');
    });
    
    viewSavedBtn.addEventListener('click', () => {
        viewSavedBtn.classList.add('active');
        viewResultsBtn.classList.remove('active');
        resultsSection.style.display = 'none';
        savedSection.classList.add('visible');
        displaySavedItems();
    });
    
    // Toggle advanced filters
    toggleFiltersBtn.addEventListener('click', () => {
        advancedFilters.classList.toggle('visible');
        if (advancedFilters.classList.contains('visible')) {
            toggleFiltersBtn.innerHTML = '<i class="fas fa-times"></i> Close Filters';
        } else {
            toggleFiltersBtn.innerHTML = '<i class="fas fa-sliders-h"></i> Advanced Filters';
        }
    });
    
    // Apply advanced filters
    yearFilter.addEventListener('change', applyAdvancedFilters);
    ratingFilter.addEventListener('change', applyAdvancedFilters);
    streamingFilter.addEventListener('change', applyAdvancedFilters);
    
    function applyAdvancedFilters() {
        if (currentQuery) {
            searchEntertainment(currentQuery);
            showToast('Filters applied', 'success');
        }
    }
    
    // Initialize API status
    tvmazeStatus.className = 'status-dot status-online';
    moviesapiStatus.className = 'status-dot status-online';
    
    // Pre-load popular content on first load
    searchEntertainment('popular');
    
    // Update filter buttons accessibility on load
    updateFilterButtons();
    
    // Display saved items if any
    displaySavedItems();
});
