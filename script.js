// Replace the current searchEntertainment function with this implementation
async function searchEntertainment(query, page = 1) {
    loadingElement.style.display = 'block';
    errorElement.style.display = 'none';
    noResultsElement.style.display = 'none';
    
    if (page === 1) {
        resultsContainer.innerHTML = '';
        usedIds.clear();
    }
    
    try {
        if (page === 1) {
            currentResults = [];
        }
        
        resultsTitle.textContent = `Results for "${query}"`;
        currentQuery = query;
        currentPage = page;
        
        // Get genre mapping
        const genre = genreMappings[query] || {};
        
        // Search for TV shows using TVmaze API
        try {
            tvmazeStatus.className = 'status-dot status-loading';
            let tvmazeUrl = `${TVMAZE_API_URL}search/shows?q=${encodeURIComponent(query)}`;
            
            if (genre.tvmaze) {
                tvmazeUrl = `${TVMAZE_API_URL}shows?genres=${genre.tvmaze}`;
            }
            
            const tvmazeResponse = await fetch(tvmazeUrl);
            if (tvmazeResponse.ok) {
                const tvmazeData = await tvmazeResponse.json();
                
                // Process TVmaze results
                if (tvmazeData && tvmazeData.length > 0) {
                    const shows = genre.tvmaze ? tvmazeData : tvmazeData.map(item => item.show);
                    
                    for (const show of shows.slice(0, 6)) {
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
                                    bingeScore: Math.floor(Math.random() * 20) + 75
                                }
                            });
                            usedIds.add(`tv-${show.id}`);
                        }
                    }
                    tvmazeStatus.className = 'status-dot status-online';
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
        }
        
        // Search for movies using TMDB API
        try {
            moviesapiStatus.className = 'status-dot status-loading';
            let moviesUrl = `${TMDB_API_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`;
            
            if (genre.tmdb) {
                moviesUrl = `${TMDB_API_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genre.tmdb}&page=${page}`;
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
            
            const moviesResponse = await fetch(moviesUrl);
            if (moviesResponse.ok) {
                const moviesData = await moviesResponse.json();
                
                // Process movies results
                if (moviesData && moviesData.results && moviesData.results.length > 0) {
                    for (const item of moviesData.results.slice(0, 6)) {
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
                                    bingeScore: Math.floor(Math.random() * 20) + 75,
                                    streaming: streamingBadge
                                }
                            });
                            usedIds.add(`movie-${item.id}`);
                        }
                    }
                    moviesapiStatus.className = 'status-dot status-online';
                    
                    // Show load more button if there are more pages
                    if (moviesData.total_pages > page) {
                        loadMoreBtn.style.display = 'block';
                    } else {
                        loadMoreBtn.style.display = 'none';
                    }
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
        }
        
        if (currentResults.length > 0) {
            displayResults(currentResults);
        } else {
            noResultsElement.style.display = 'block';
            resultsTitle.textContent = 'No Results Found';
        }
    } catch (error) {
        console.error('Error:', error);
        errorElement.style.display = 'block';
    } finally {
        loadingElement.style.display = 'none';
        instructions.style.display = 'none';
        
        // Lazy load images after a short delay
        setTimeout(lazyLoadImages, 100);
    }
}
