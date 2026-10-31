const API_BASE = 'https://api.coinpaprika.com/v1';

const cryptoCards = document.getElementById('cryptoCards');
const cryptoTable = document.getElementById('cryptoTable');

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

const favoritesContainer = document.getElementById('favoritesContainer');

const themeBtn = document.getElementById('themeBtn');

let allCoins = [];

let favorites = JSON.parse(localStorage.getItem('cryptoFavorites')) || [];

let currentChartCoin = 'btc-bitcoin';
let currentChartDays = 7;

document.addEventListener('DOMContentLoaded', function () {
  loadTheme();

  fetchCoins();
});
if (themeBtn) {
  themeBtn.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');

  const isDark = document.body.classList.contains('dark-mode');

  localStorage.setItem('cryptoTheme', isDark ? 'dark' : 'light');

  themeBtn.textContent = isDark ? '☀️' : '🌙';
}
function loadTheme() {
  const theme = localStorage.getItem('cryptoTheme');

  if (theme === 'dark') {
    document.body.classList.add('dark-mode');

    if (themeBtn) {
      themeBtn.textContent = '☀️';
    }
  }
}

if (searchBtn) {
  searchBtn.addEventListener('click', searchCoins);
}

if (searchInput) {
  searchInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      searchCoins();
    }
  });
}
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '$--';
  }

  value = Number(value);

  if (value >= 1) {
    return (
      '$' +
      value.toLocaleString('en-US', {
        maximumFractionDigits: 2,
      })
    );
  }

  return (
    '$' +
    value.toLocaleString('en-US', {
      maximumFractionDigits: 8,
    })
  );
}

function formatLargeNumber(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '$--';
  }

  value = Number(value);

  if (value >= 1e12) {
    return '$' + (value / 1e12).toFixed(2) + 'T';
  }

  if (value >= 1e9) {
    return '$' + (value / 1e9).toFixed(2) + 'B';
  }

  if (value >= 1e6) {
    return '$' + (value / 1e6).toFixed(2) + 'M';
  }

  if (value >= 1e3) {
    return '$' + (value / 1e3).toFixed(2) + 'K';
  }

  return '$' + Number(value).toLocaleString();
}

function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }

  const number = Number(value);

  if (number >= 0) {
    return '+' + number.toFixed(2) + '%';
  }

  return number.toFixed(2) + '%';
}

function getChangeClass(value) {
  if (Number(value) >= 0) {
    return 'positive';
  }

  return 'negative';
}

function getSymbol(coin) {
  if (!coin || !coin.symbol) {
    return '';
  }

  return coin.symbol.toUpperCase();
}

function getCoinImage(coin) {
  if (coin.image) {
    return coin.image;
  }

  return `https://static.coinpaprika.com/coin/${coin.id}/logo.png`;
}

function getDaysFromButton(value) {
  switch(value.trim().toUpperCase()){
    case '24h':
      return 1;
    case '7D' :
      return 7;
    case '1Y' :
      return 365;
    case '30D' :
      return 30;
    default :
    return 7;      
  }
}


async function fetchCoins() {
  try {
    cryptoCards.innerHTML = `
            <div class="loading">
                Loading cryptocurrencies...
            </div>
        `;

    cryptoTable.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    Loading market data...
                </td>
            </tr>
        `;

    const response = await fetch(`${API_BASE}/tickers?quotes=USD`);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          'CoinPaprika API rate limit reached. Please try again later.'
        );
      }

      throw new Error('Unable to fetch cryptocurrency data.');
    }

    let data = await response.json();

    // Sort by market cap
    data.sort((a, b) => {
      const marketCapA = a.quotes?.USD?.market_cap || 0;

      const marketCapB = b.quotes?.USD?.market_cap || 0;

      return marketCapB - marketCapA;
    });

    // Keep top 50
    allCoins = data.slice(0, 50);

    // Convert CoinPaprika format into
    // the format used by our dashboard
    allCoins = allCoins.map((coin) => {
      const usd = coin.quotes?.USD || {};

      return {
        id: coin.id,

        name: coin.name,

        symbol: coin.symbol,

        rank: coin.rank,

        current_price: usd.price,

        market_cap: usd.market_cap,

        total_volume: usd.volume_24h,

        price_change_percentage_24h: usd.percent_change_24h,

        image: getCoinImage(coin),
      };
    });

    displayTopCoins();

    displayMarketTable();

    displayFavorites();

    // Load Bitcoin chart initially
    loadChart('btc-bitcoin');
  } catch (error) {
    console.error(error);

    cryptoCards.innerHTML = `
            <div class="error-message">

                <h3>
                    Unable to load crypto data
                </h3>

                <p>
                    ${error.message}
                </p>

                <button onclick="fetchCoins()">
                    Try Again
                </button>

            </div>
        `;

    cryptoTable.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    Unable to load market data.
                </td>
            </tr>
        `;
  }
}

function displayTopCoins() {
  cryptoCards.innerHTML = '';

  const topCoins = allCoins.slice(0, 3);

  topCoins.forEach((coin) => {
    const change = coin.price_change_percentage_24h;

    const card = document.createElement('div');

    card.className = 'crypto-card';

    card.innerHTML = `

            <div class="coin-header">

                <div class="coin-info">

                    <img
                        class="coin-image-real"
                        src="${coin.image}"
                        alt="${coin.name}"
                        onerror="this.style.display='none'"
                    >

                    <div>

                        <h3>
                            ${coin.name}
                        </h3>

                        <p>
                            ${getSymbol(coin)}
                        </p>

                    </div>

                </div>


                <button
                    class="star-btn"
                    onclick="toggleFavorite('${coin.id}')"
                >

                    ${isFavorite(coin.id) ? '★' : '☆'}

                </button>

            </div>


            <div class="coin-price">

                <h2>
                    ${formatCurrency(coin.current_price)}
                </h2>

                <span
                    class="${getChangeClass(change)}"
                >

                    ${formatPercentage(change)}

                </span>

            </div>


            <div class="mini-chart">

                <div class="chart-line"></div>

            </div>


            <div class="coin-footer">

                <span>
                    Market Cap
                </span>

                <strong>
                    ${formatLargeNumber(coin.market_cap)}
                </strong>

            </div>

        `;

    card.addEventListener('click', function (event) {
      if (event.target.classList.contains('star-btn')) {
        return;
      }

      currentChartCoin = coin.id;

      loadChart(coin.id);

      updateChartTitle(coin);
    });

    cryptoCards.appendChild(card);
  });
}

function displayMarketTable(coin = allCoins) {
  cryptoTable.innerHTML = ``;
  if (coin.length === 0) {
    cryptoTable.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center">No cryptrocurrencies found</td>
      </tr>
    `;
    return;
  }
  coin.slice(0, 50).forEach((coin, index) => {
    const change = coin.price_change_percentage_24h;
    const row = document.createElement('tr');
    row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <div class="table-coin">
                        <img class="table-coin-image"
                        src="${coin.image}" alt="${coin.name}"
                        onerror="this.style.display='none'">
                        <div>
                            <strong>${coin.name}</strong>
                            <span>${getSymbol(coin)}</span>
                        </div>
                    </div>
                </td>
                <td>${formatCurrency(coin.current_price)}</td>
                <td>
                    <span class="${getChangeClass(change)}">
                        ${formatPercentage(change)}
                    </span>
                </td>
                <td>${formatLargeNumber(coin.total_volume)}</td>
                <td>${formatLargeNumber(coin.market_cap)}</td>
                <td>
                    <button
                        class="details-btn"
                        onclick="showCoinDetails('${coin.id}')">
                        Details
                    </button>
                </td>

            `;

    cryptoTable.appendChild(row);
  });
}
const viewAllBtn = document.querySelector('.view-all-btn');
if (viewAllBtn) {
  viewAllBtn.addEventListener('click', function () {
    document.getElementById('markets').scrollIntoView({
      behavior: 'smooth',
    });
  });
}
function searchCoins() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    displayMarketTable(allCoins);
    return;
  }
  const filteredCoins = allCoins.filter((coin) => {
    return (
      coin.name.toLowerCase().includes(query) ||
      coin.symbol.toLowerCase().includes(query)
    );
  });
  displayMarketTable(filteredCoins);
  document.getElementById('markets').scrollIntoView({
    behavior: 'smooth',
  });
}
async function showCoinDetails(coinId) {
  try{
    const response = await fetch(`${API_BASE}/coins/${coinId}`);
    if (!response.ok) {
      throw new Error('Unable to load coin details.');
    }
    const coin = await response.json();
    const existing = document.querySelector('.coin-modal');

    if (existing) {
      existing.remove();
    }

    // Get latest ticker data
    const tickerResponse = await fetch(
      `${API_BASE}/tickers/${coinId}?quotes=USD`
    );

    let ticker = null;

    if (tickerResponse.ok) {
      ticker = await tickerResponse.json();
    }
    const usd = ticker?.quotes?.USD || {};
    const description = coin.description || 'NO DESCRIPTION AVAILABLE';
    const modal = document.createElement('div');
    modal.className = 'coin-modal';
    modal.innerHTML = `
        <div class='modal-box'>
           <button class="modal-close" onclick="this.closest('.coin-modal').remove()">X</button>
           <div class="modal-coin-header">
               <img src="${getCoinImage({id:coin.id})}" alt="${coin.name}" onerror="this.style.display='none'" />
               <div>
                  <h2>${coin.name}</h2>
                  <p>${coin.symbol ? coin.symbol.toUpperCase() : ''}</p>
               </div>
            </div> 
           <div class=modal-stats>
          <div>
            <span> Current Price</span><strong>${formatCurrency(usd.price)}</strong>
          </div>
          <div>
            <span>Market Cap</span><strong>${formatLargeNumber(usd.market_cap)}</strong>
          </div>
          <div>
            <span>24h change</span></span><strong class="${getChangeClass(usd.percent_change_24h)}">${formatPercentage(usd.percent_change_24h)}</strong>
          </div>
          <div>
            <span>24h volume</span><strong>${formatLargeNumber(usd.volume_24h)}</strong>
          </div>
          </div>
          <div class="modal-description">
             <h3>About ${coin.name}</h3>
             <p>${cleanDescription(description)}</p>
          </div>
          <button
                    class="modal-chart-btn"
                    onclick="
                        document
                            .querySelector(
                                '.coin-modal'
                            )
                            .remove();

                        loadChart(
                            '${coin.id}'
                        );

                        document
                            .querySelector(
                                '.chart-section'
                            )
                            .scrollIntoView({
                                behavior:'smooth'
                            });
                    "
                >
                    View Price Chart
                </button>
        </div>`;
    document.body.appendChild(modal);
  }
  catch(error) {
    console.log(error);
    alert('Unable to load coin details');
  }
}
function cleanDescription (description) {
  const temp=document.createElement('div');
  temp.innerHTML = description;
  const text = temp.textContent || temp.innerText || '';
  return text.substring(0, 700).trim();
}
function isFavorite(id) {
  return favorites.includes(id);
}
function toggleFavorite(id) {
  if(favorites.includes(id)){
      favorites=favorites.filter((coinId) => coinId !== id);
  }else{
    favorites.push(id);
  }
  localStorage.setItem('cryptoFavorite', JSON.stringify(favorites));
  displayFavorites();
  displayTopCoins();
}
function displayFavorites() {
  favoritesContainer.innerHTML = '';
  if(favorites.length ===0) {
    favoritesContainer.innerHTML = `
       <div class="empty-favorites">
          <span>☆</span>
          <h3>No Favorite Coins</h3>
          <p>Add cryptocurrencies to your favorites to see them here.</p>
       </div>`;
       return;
  }
  const favoriteCoins = allCoins.filter((coin) => favorites.includes(coin.id));
  favoriteCoins.forEach((coin) => {
    const div = document.createElement('div');
    div.className = 'favorite-card';
    div.innerHTML = `
        <img class="coin-image-real"
        src = "${coin.image}"
        alt = "${coin.name}"
        onerror="this.style.display='none'">
        <div>
           <strong>${coin.name}</strong>
           <span>${formatCurrency(coin.current_price)}</span>
           <small class="${getChangeClass(coin.price_change_percentage_24h)}">
              ${formatPercentage(coin.price_change_percentage_24h)}</small>
        </div>
        <button onclick="toggleFavorite('${coin.id}')">Remove</button>
        `;
    favoritesContainer.appendChild(div);
  })
}// ===============================
// LOAD PRICE CHART
// ===============================

async function loadChart(coinId = 'btc-bitcoin', days = currentChartDays) {
  try {
    currentChartCoin = coinId;

    currentChartDays = days;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const start = startDate.toISOString().split('T')[0];

    /*
     * CoinPaprika free historical API
     * supports daily historical data.
     */

    const url =
      `${API_BASE}/tickers/${coinId}/historical` +
      `?start=${start}` +
      `&interval=1d` +
      `&quote=usd`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Unable to load price chart.');
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No historical data available.');
    }

    drawChart(data);

    const coin = allCoins.find((item) => item.id === coinId);

    if (coin) {
      updateChartTitle(coin);
    }
  } catch (error) {
    console.error('Chart error:', error);
  }
}

// ===============================
// DRAW CHART
// ===============================

function drawChart(data) {
  const chart = document.querySelector('.fake-chart');

  if (!chart) {
    return;
  }

  chart.innerHTML = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('viewBox', '0 0 1000 300');

  svg.setAttribute('preserveAspectRatio', 'none');

  const polyline = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'polyline'
  );

  const selectedData = data.slice(-100);

  const values = selectedData.map((item) => Number(item.price));

  const min = Math.min(...values);

  const max = Math.max(...values);

  const range = max - min || 1;

  const points = selectedData.map((item, index) => {
    const x =
      selectedData.length === 1
        ? 0
        : (index / (selectedData.length - 1)) * 1000;

    const y = 280 - ((Number(item.price) - min) / range) * 250;

    return `${x},${y}`;
  });

  polyline.setAttribute('points', points.join(' '));

  polyline.setAttribute('fill', 'none');

  polyline.setAttribute('stroke', '#f7931a');

  polyline.setAttribute('stroke-width', '4');

  polyline.setAttribute('vector-effect', 'non-scaling-stroke');

  svg.appendChild(polyline);

  chart.appendChild(createChartGrid());

  chart.appendChild(svg);
}

// ===============================
// CHART GRID
// ===============================

function createChartGrid() {
  const grid = document.createElement('div');

  grid.className = 'chart-grid';

  return grid;
}

// ===============================
// UPDATE CHART TITLE
// ===============================

function updateChartTitle(coin) {
  const title = document.querySelector('.chart-section h2');

  const price = document.querySelector('.chart-price');

  if (title) {
    title.textContent = `${coin.name} Price Chart`;
  }

  if (price) {
    price.textContent = formatCurrency(coin.current_price);
  }
}

// ===============================
// CHART TIME BUTTONS
// ===============================

const timeButtons = document.querySelectorAll('.time-buttons button');

timeButtons.forEach((button) => {
  button.addEventListener('click', function () {
    timeButtons.forEach((btn) => btn.classList.remove('active'));

    this.classList.add('active');

    const days = getDaysFromButton(this.textContent);

    loadChart(currentChartCoin, days);
  });
});