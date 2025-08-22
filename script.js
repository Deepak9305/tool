<script>
    document.addEventListener('DOMContentLoaded', function() {
        // ... (keep all the existing variable declarations)
        
        // Updated API configuration
        const TMDB_API_URL = 'https://api.themoviedb.org/3';
        const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb'; // This is a real API key from your code
        const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
        
        const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/300x450/2D3047/8B8BA0?text=No+Image';
        
        // Genre mappings for TMDB API
        const genreMappings = {
            'popular': {id: '', name: 'Popular'},
            'comedy': {id: '35', name: 'Comedy'},
            'action': {id: '28', name: 'Action'},
            'drama': {id: '18', name: 'Drama'},
            'sci-fi': {id: '878', name: 'Science Fiction'},
            'thriller': {id: '53', name: 'Thriller'}
        };
        
        // ... (keep all other existing code until the searchEntertainment function)
        
        // Function to search APIs - UPDATED
        async function searchEntertainment(query, page = 1) {
            loadingElement.style.display = 'block';
            errorElement.style.display = 'none';
            noResultsElement.style.display = 'none';
            
            if (page === 1) {
                resultsContainer.innerHTML = '';
                usedIds.clear();
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
                
                // Get genre mapping if it's a predefined category
                const genre = genreMappings[query] || {};
                
                // Search for both movies and TV shows using TMDB API
                try {
                    tvmazeStatus.className = 'status-dot status-loading';
                    moviesapiStatus.className = 'status-dot status-loading';
                    
                    let moviesUrl, tvUrl;
                    
                    if (genre.id) {
                        // Search by genre if it's a predefined category
                        moviesUrl = `${TMDB_API_URL}/discover/movie?api_key=${TMDB_API_KEY}&page=${page}&with_genres=${genre.id}`;
                        tvUrl = `${TMDB_API_URL}/discover/tv?api_key=${TMDB_API_KEY}&page=${page}&with_genres=${genre.id}`;
                    } else if (query === 'popular') {
                        // Get popular content
                        moviesUrl = `${TMDB_API_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`;
                        tvUrl = `${TMDB_API_URL}/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`;
                    } else {
                        // Search by query text
                        moviesUrl = `${TMDB_API_URL}/search/movie?api_key=${TMDB_API_KEY}&page=${page}&query=${encodeURIComponent(query)}`;
                        tvUrl = `${TMDB_API_URL}/search/tv?api_key=${TMDB_API_KEY}&page=${page}&query=${encodeURIComponent(query)}`;
                    }
                    
                    // Apply advanced filters if set
                    const yearValue = yearFilter.value;
                    if (yearValue && yearValue !== '') {
                        const yearParam = yearValue.includes('-') ? `&primary_release_date.gte=${yearValue.split('-')[0]}-01-01&primary_release_date.lte=${yearValue.split('-')[1]}-12-31` : `&year=${yearValue}`;
                        moviesUrl += yearParam;
                        tvUrl += yearParam.replace('primary_release_date', 'first_air_date');
                    }
                    
                    const ratingValue = ratingFilter.value;
                    if (ratingValue > 0) {
                        moviesUrl += `&vote_average.gte=${ratingValue}`;
                        tvUrl += `&vote_average.gte=${ratingValue}`;
                    }
                    
                    // Fetch both movies and TV shows in parallel
                    const [moviesResponse, tvResponse] = await Promise.all([
                        fetch(moviesUrl),
                        fetch(tvUrl)
                    ]);
                    
                    if (moviesResponse.ok) {
                        const moviesData = await moviesResponse.json();
                        
                        if (moviesData.results && moviesData.results.length > 0) {
                            for (const item of moviesData.results) {
                                if (!usedIds.has(`movie-${item.id}`)) {
                                    // Add streaming service badge if filter is set
                                    let streamingBadge = '';
                                    if (streamingFilter.value) {
                                        streamingBadge = `<span class="streaming-badge ${streamingFilter.value}">${streamingServices[streamingFilter.value]}</span>`;
                                    }
                                    
                                    currentResults.push({
                                        type: 'movie',
                                        data: {
                                            id: `movie-${item.id}`,
                                            title: item.title,
                                            year: item.release_date ? new Date(item.release_date).getFullYear() : 'N/A',
                                            poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : PLACEHOLDER_IMAGE,
                                            rating: item.vote_average ? item.vote_average.toFixed(1) : 'N/A',
                                            plot: item.overview ? item.overview : 'No description available',
                                            type: 'movie',
                                            country: item.original_language ? item.original_language.toUpperCase() : 'Unknown',
                                            bingeScore: calculateBingeScore(item.vote_average, item.popularity),
                                            streaming: streamingBadge
                                        }
                                    });
                                    usedIds.add(`movie-${item.id}`);
                                }
                            }
                            moviesapiStatus.className = 'status-dot status-online';
                        } else {
                            console.log('No movie results from TMDB API');
                        }
                    } else {
                        throw new Error('TMDB API error for movies');
                    }
                    
                    if (tvResponse.ok) {
                        const tvData = await tvResponse.json();
                        
                        if (tvData.results && tvData.results.length > 0) {
                            for (const item of tvData.results) {
                                if (!usedIds.has(`tv-${item.id}`)) {
                                    // Add streaming service badge if filter is set
                                    let streamingBadge = '';
                                    if (streamingFilter.value) {
                                        streamingBadge = `<span class="streaming-badge ${streamingFilter.value}">${streamingServices[streamingFilter.value]}</span>`;
                                    }
                                    
                                    currentResults.push({
                                        type: 'tv',
                                        data: {
                                            id: `tv-${item.id}`,
                                            title: item.name,
                                            year: item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'N/A',
                                            poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : PLACEHOLDER_IMAGE,
                                            rating: item.vote_average ? item.vote_average.toFixed(1) : 'N/A',
                                            plot: item.overview ? item.overview : 'No description available',
                                            type: 'tv',
                                            country: item.original_language ? item.original_language.toUpperCase() : 'Unknown',
                                            bingeScore: calculateBingeScore(item.vote_average, item.popularity),
                                            streaming: streamingBadge
                                        }
                                    });
                                    usedIds.add(`tv-${item.id}`);
                                }
                            }
                            tvmazeStatus.className = 'status-dot status-online';
                        } else {
                            console.log('No TV results from TMDB API');
                        }
                    } else {
                        throw new Error('TMDB API error for TV shows');
                    }
                    
                    // Show load more button if there are more pages
                    loadMoreBtn.style.display = (moviesData.total_pages > page || tvData.total_pages > page) ? 'block' : 'none';
                    
                } catch (apiError) {
                    console.error('API error:', apiError);
                    tvmazeStatus.className = 'status-dot status-offline';
                    moviesapiStatus.className = 'status-dot status-offline';
                    loadMoreBtn.style.display = 'none';
                    showToast('API is temporarily unavailable', 'error');
                }
                
                if (currentResults.length > 0) {
                    displayResults(currentResults);
                    showToast(`Found ${currentResults.length} results`, 'success');
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
        
        // Helper function to calculate binge score
        function calculateBingeScore(rating, popularity) {
            // Convert rating from 10-point scale to percentage
            const ratingScore = (rating || 5) * 10;
            // Convert popularity to a 0-30 scale (TMDB popularity can vary widely)
            const popularityScore = Math.min(30, (popularity || 0) / 5);
            // Combine with some randomness for variety
            const randomFactor = Math.floor(Math.random() * 10);
            
            return Math.min(100, Math.floor(ratingScore + popularityScore + randomFactor));
        }
        
        // ... (keep the rest of the existing functions)
    });
</script>
