(function () {
    const API_URL = 'backend.php';
    const STORAGE_KEY = 'dlcrCars';
    const DEFAULT_CARS = Array.isArray(window.DLCR_DEFAULT_CARS) ? window.DLCR_DEFAULT_CARS.map((car) => normalizeCar(car)) : [];
    const CAN_USE_BACKEND = window.location.protocol !== 'file:';
    let cachedCars = null;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function slugify(value) {
        return String(value)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function formatCurrency(value) {
        if (value === null || value === undefined || value === '') {
            return 'Op aanvraag';
        }

        const numberValue = Number(value);

        if (!Number.isFinite(numberValue)) {
            return String(value);
        }

        return new Intl.NumberFormat('nl-NL', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
        }).format(numberValue);
    }

    function formatMileage(value) {
        const numberValue = Number(value);

        if (!Number.isFinite(numberValue)) {
            return String(value || 'N.v.t.');
        }

        return new Intl.NumberFormat('nl-NL').format(numberValue) + ' km';
    }

    function normalizeCar(car) {
        const title = car.title || 'Onbekende auto';

        return {
            id: car.id || slugify(title),
            title,
            make: car.make || title.split(' ')[0],
            price: Number(car.price) || 0,
            priceDisplay: car.priceDisplay || formatCurrency(car.price),
            offer: car.offer || 'Beschikbaar',
            year: Number(car.year) || new Date().getFullYear(),
            mileage: Number(car.mileage) || 0,
            mileageDisplay: car.mileageDisplay || formatMileage(car.mileage),
            power: Number(car.power) || 0,
            powerDisplay: car.powerDisplay || `${Number(car.power) || 0} PK`,
            transmission: car.transmission || 'N.v.t.',
            fuel: car.fuel || 'N.v.t.',
            drivetrain: car.drivetrain || 'N.v.t.',
            bodyType: car.bodyType || 'Auto',
            category: car.category || 'performance',
            image: car.image || 'assets/images/hero.png',
            description: car.description || '',
        };
    }

    function readStoredCars() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function buildFallbackCars() {
        const storedCars = readStoredCars();
        const source = storedCars && storedCars.length ? storedCars : DEFAULT_CARS;
        return source.map((car) => normalizeCar(car));
    }

    async function apiRequest(action, options = {}) {
        if (!CAN_USE_BACKEND) {
            throw new Error('Backend unavailable in file preview mode');
        }

        const response = await window.fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
            ...options,
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok || (payload && payload.ok === false)) {
            throw new Error((payload && payload.error) || `Request failed: ${response.status}`);
        }

        return payload;
    }

    async function loadCars(forceRefresh = false) {
        if (cachedCars && !forceRefresh) {
            return cachedCars;
        }

        try {
            const payload = await apiRequest('cars', { method: 'GET' });
            cachedCars = Array.isArray(payload.cars) ? payload.cars.map((car) => normalizeCar(car)) : [];
            return cachedCars;
        } catch (error) {
            cachedCars = buildFallbackCars();
            return cachedCars;
        }
    }

    async function getCars(forceRefresh = false) {
        return loadCars(forceRefresh);
    }

    async function saveCar(car) {
        if (CAN_USE_BACKEND) {
            const payload = await apiRequest('save', {
                method: 'POST',
                body: JSON.stringify(car),
            });

            cachedCars = null;
            return normalizeCar(payload.car);
        }

        const cars = buildFallbackCars();
        const updatedCar = normalizeCar(car);
        const index = cars.findIndex((entry) => entry.id === updatedCar.id);

        if (index >= 0) {
            cars[index] = updatedCar;
        } else {
            cars.unshift(updatedCar);
        }

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
        cachedCars = cars;
        return updatedCar;
    }

    async function deleteCar(id) {
        if (CAN_USE_BACKEND) {
            await apiRequest('delete', {
                method: 'POST',
                body: JSON.stringify({ id }),
            });

            cachedCars = null;
            return;
        }

        const cars = buildFallbackCars().filter((car) => car.id !== id);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
        cachedCars = cars;
    }

    async function resetCars() {
        if (CAN_USE_BACKEND) {
            await apiRequest('seed', { method: 'POST' });
            cachedCars = null;
            return;
        }

        const defaults = DEFAULT_CARS.map((car) => normalizeCar(car));
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
        cachedCars = defaults;
    }

    function getContactUrl(title) {
        return `contact.html?car=${encodeURIComponent(String(title).replace(/\s+/g, '_'))}`;
    }

    function getDetailUrl(id) {
        return `car.html?id=${encodeURIComponent(id)}`;
    }

    function categoryLabel(category) {
        const labels = {
            young: 'Young driver',
            performance: 'Performance',
            premium: 'Premium',
            exotic: 'Exotic',
        };

        return labels[category] || 'Auto';
    }

    function renderSpecItem(label, value) {
        return `
            <div class="spec-card">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
            </div>
        `;
    }

    function renderInventoryCard(car) {
        return `
            <article class="car-card">
                <img src="${escapeHtml(car.image)}" alt="${escapeHtml(car.title)}" class="car-image">
                <div class="car-details car-card-body">
                    <span class="car-badge">${escapeHtml(categoryLabel(car.category))}</span>
                    <h3 class="car-title">${escapeHtml(car.title)}</h3>
                    <p class="car-price">${escapeHtml(car.priceDisplay)}</p>
                    <p class="car-summary">${escapeHtml(car.offer)}</p>
                    <div class="car-specs">
                        <div class="spec-item">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>${escapeHtml(car.powerDisplay)}</span>
                        </div>
                        <div class="spec-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${escapeHtml(car.year)}</span>
                        </div>
                        <div class="spec-item">
                            <i class="fas fa-road"></i>
                            <span>${escapeHtml(car.mileageDisplay)}</span>
                        </div>
                    </div>
                    <div class="car-actions">
                        <a href="${getDetailUrl(car.id)}" class="btn btn-primary">Bekijk details</a>
                        <a href="${getContactUrl(car.title)}" class="btn btn-outline">Vraag info aan</a>
                    </div>
                </div>
            </article>
        `;
    }

    function renderSimilarCard(car) {
        return `
            <article class="similar-card">
                <img src="${escapeHtml(car.image)}" alt="${escapeHtml(car.title)}">
                <div class="similar-card-body">
                    <span class="car-badge">${escapeHtml(categoryLabel(car.category))}</span>
                    <h3>${escapeHtml(car.title)}</h3>
                    <p>${escapeHtml(car.priceDisplay)}</p>
                    <p>${escapeHtml(car.powerDisplay)} · ${escapeHtml(car.year)}</p>
                    <a href="${getDetailUrl(car.id)}" class="btn btn-outline" style="width: 100%; margin-top: 1rem; text-align: center;">Bekijk auto</a>
                </div>
            </article>
        `;
    }

    function renderDetailPage(car) {
        return `
            <div class="detail-layout">
                <section class="detail-hero">
                    <img class="detail-image" src="${escapeHtml(car.image)}" alt="${escapeHtml(car.title)}">
                    <div class="detail-copy">
                        <div class="detail-topline">
                            <span class="car-badge">${escapeHtml(categoryLabel(car.category))}</span>
                            <a href="inventory.html" class="btn btn-outline">Terug naar aanbod</a>
                        </div>
                        <h2 class="detail-title">${escapeHtml(car.title)}</h2>
                        <div class="detail-price">${escapeHtml(car.priceDisplay)}</div>
                        <p class="detail-description">${escapeHtml(car.description)}</p>
                        <div class="car-actions">
                            <a href="${getContactUrl(car.title)}" class="btn btn-primary">Vraag info aan</a>
                            <a href="contact.html" class="btn btn-secondary">Plan contact</a>
                        </div>
                    </div>
                </section>
                <aside class="detail-panel">
                    <h3>Aanbod & specs</h3>
                    <div class="spec-grid">
                        ${renderSpecItem('Vraagprijs', car.priceDisplay)}
                        ${renderSpecItem('Aanbod', car.offer)}
                        ${renderSpecItem('Vermogen', car.powerDisplay)}
                        ${renderSpecItem('Bouwjaar', String(car.year))}
                        ${renderSpecItem('Kilometerstand', car.mileageDisplay)}
                        ${renderSpecItem('Transmissie', car.transmission)}
                        ${renderSpecItem('Brandstof', car.fuel)}
                        ${renderSpecItem('Aandrijving', car.drivetrain)}
                    </div>
                    <a href="${getContactUrl(car.title)}" class="btn btn-primary">Interesse in deze auto</a>
                </aside>
            </div>
        `;
    }

    function scoreSimilarity(baseCar, candidateCar) {
        let score = 0;

        if (baseCar.category === candidateCar.category) {
            score += 50;
        }

        if (baseCar.make === candidateCar.make) {
            score += 20;
        }

        if (baseCar.bodyType === candidateCar.bodyType) {
            score += 10;
        }

        if (baseCar.fuel === candidateCar.fuel) {
            score += 5;
        }

        if (baseCar.transmission === candidateCar.transmission) {
            score += 5;
        }

        const priceGap = Math.abs(baseCar.price - candidateCar.price) / Math.max(baseCar.price, candidateCar.price, 1);

        if (priceGap <= 0.1) {
            score += 35;
        } else if (priceGap <= 0.25) {
            score += 20;
        } else if (priceGap <= 0.45) {
            score += 10;
        }

        const powerGap = Math.abs(baseCar.power - candidateCar.power);

        if (powerGap <= 50) {
            score += 10;
        } else if (powerGap <= 120) {
            score += 5;
        }

        return score;
    }

    async function getSimilarCars(baseCar, sourceCars = null) {
        const cars = sourceCars || await getCars();

        return cars
            .filter((candidateCar) => candidateCar.id !== baseCar.id)
            .map((candidateCar) => ({
                car: candidateCar,
                score: scoreSimilarity(baseCar, candidateCar),
            }))
            .sort((left, right) => right.score - left.score)
            .map((entry) => entry.car);
    }

    function setupNavbar() {
        const nav = document.getElementById('navbar');
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.getElementById('nav-links');

        if (nav) {
            window.addEventListener('scroll', () => {
                nav.classList.toggle('scrolled', window.scrollY > 50);
            });
        }

        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                const icon = hamburger.querySelector('i');

                if (!icon) {
                    return;
                }

                if (navLinks.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        }
    }

    function setupContactForm() {
        const contactForm = document.getElementById('contactForm');

        if (!contactForm) {
            return;
        }

        contactForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const button = contactForm.querySelector('button[type="submit"]');

            if (!button) {
                return;
            }

            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verzenden...';
            button.disabled = true;

            window.setTimeout(() => {
                button.innerHTML = '<i class="fas fa-check"></i> Bericht verzonden';
                button.classList.add('btn-primary');
                contactForm.reset();

                window.setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 2500);
            }, 1200);
        });
    }

    async function setupInventoryPage() {
        const inventoryGrid = document.getElementById('inventoryGrid');

        if (!inventoryGrid) {
            return;
        }

        const cars = await getCars();
        const inventoryCount = document.getElementById('inventoryCount');

        if (inventoryCount) {
            inventoryCount.textContent = `${cars.length} auto's beschikbaar`;
        }

        inventoryGrid.innerHTML = cars.map(renderInventoryCard).join('');
    }

    async function setupCarDetailPage() {
        const detailRoot = document.getElementById('carDetailApp');

        if (!detailRoot) {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get('id');
        const cars = await getCars();
        const car = requestedId ? cars.find((candidate) => candidate.id === requestedId) : cars[0];
        const similarRoot = document.getElementById('similarCars');
        const detailHeaderTitle = document.getElementById('detailHeaderTitle');
        const detailHeaderSubtitle = document.getElementById('detailHeaderSubtitle');

        if (!car) {
            detailRoot.innerHTML = `
                <div class="detail-not-found">
                    <h2>Auto niet gevonden</h2>
                    <p>Deze auto bestaat niet in de huidige voorraad.</p>
                    <a href="inventory.html" class="btn btn-primary">Terug naar aanbod</a>
                </div>
            `;

            if (similarRoot) {
                similarRoot.innerHTML = '';
            }

            return;
        }

        document.title = `${car.title} | DLCR`;

        if (detailHeaderTitle) {
            detailHeaderTitle.textContent = car.title;
        }

        if (detailHeaderSubtitle) {
            detailHeaderSubtitle.textContent = `${car.offer} · ${car.priceDisplay} · ${car.year}`;
        }

        detailRoot.innerHTML = renderDetailPage(car);

        if (similarRoot) {
            const similarCars = (await getSimilarCars(car, cars)).slice(0, 4);
            similarRoot.innerHTML = similarCars.length
                ? similarCars.map(renderSimilarCard).join('')
                : '<div class="admin-empty">Geen vergelijkbare auto\'s gevonden.</div>';
        }
    }

    function readAdminForm() {
        const getField = (id) => document.getElementById(id);

        return normalizeCar({
            id: getField('carId')?.value || '',
            title: getField('title')?.value.trim(),
            make: getField('make')?.value.trim(),
            price: getField('price')?.value,
            priceDisplay: getField('priceDisplay')?.value.trim(),
            offer: getField('offer')?.value.trim(),
            year: getField('year')?.value,
            mileage: getField('mileage')?.value,
            mileageDisplay: getField('mileageDisplay')?.value.trim(),
            power: getField('power')?.value,
            powerDisplay: getField('powerDisplay')?.value.trim(),
            transmission: getField('transmission')?.value.trim(),
            fuel: getField('fuel')?.value.trim(),
            drivetrain: getField('drivetrain')?.value.trim(),
            category: getField('category')?.value,
            bodyType: getField('bodyType')?.value.trim(),
            image: getField('image')?.value.trim(),
            description: getField('description')?.value.trim(),
        });
    }

    function setAdminFormValues(car) {
        const fields = ['carId', 'title', 'make', 'price', 'priceDisplay', 'offer', 'year', 'mileage', 'mileageDisplay', 'power', 'powerDisplay', 'transmission', 'fuel', 'drivetrain', 'category', 'bodyType', 'image', 'description'];

        fields.forEach((fieldId) => {
            const field = document.getElementById(fieldId);

            if (!field) {
                return;
            }

            if (!car) {
                field.value = '';
                return;
            }

            if (fieldId === 'carId') {
                field.value = car.id;
            } else if (fieldId in car) {
                field.value = car[fieldId] ?? '';
            }
        });
    }

    function renderAdminSummary(cars) {
        const summaryTotal = document.getElementById('summaryTotal');
        const summaryAccessible = document.getElementById('summaryAccessible');
        const summaryExotic = document.getElementById('summaryExotic');

        if (summaryTotal) {
            summaryTotal.textContent = String(cars.length);
        }

        if (summaryAccessible) {
            summaryAccessible.textContent = String(cars.filter((car) => car.category === 'young' || car.category === 'performance').length);
        }

        if (summaryExotic) {
            summaryExotic.textContent = String(cars.filter((car) => car.category === 'exotic').length);
        }
    }

    function renderAdminListItem(car) {
        return `
            <article class="admin-list-item" data-id="${escapeHtml(car.id)}">
                <figure>
                    <img src="${escapeHtml(car.image)}" alt="${escapeHtml(car.title)}">
                    <figcaption>
                        <h3 class="admin-list-title">${escapeHtml(car.title)}</h3>
                        <div class="admin-list-meta">${escapeHtml(car.priceDisplay)} · ${escapeHtml(car.offer)}</div>
                        <div class="admin-list-meta">${escapeHtml(car.year)} · ${escapeHtml(car.powerDisplay)} · ${escapeHtml(categoryLabel(car.category))}</div>
                    </figcaption>
                </figure>
                <div class="admin-actions">
                    <button type="button" class="btn btn-secondary" data-action="edit">Bewerken</button>
                    <button type="button" class="btn btn-secondary" data-action="delete">Verwijderen</button>
                </div>
            </article>
        `;
    }

    async function setupAdminPage() {
        const form = document.getElementById('carForm');
        const list = document.getElementById('adminList');

        if (!form || !list) {
            return;
        }

        const saveButton = document.getElementById('saveCarButton');
        const resetFormButton = document.getElementById('resetFormButton');
        const resetDemoButton = document.getElementById('resetDemoButton');

        async function renderAdminPanel() {
            const cars = await getCars(true);
            renderAdminSummary(cars);
            list.innerHTML = cars.length
                ? cars.map(renderAdminListItem).join('')
                : "<div class=\"admin-empty\">Nog geen auto's toegevoegd.</div>";
        }

        function clearForm() {
            form.reset();
            setAdminFormValues(null);
            if (saveButton) {
                saveButton.textContent = 'Auto opslaan';
            }
        }

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const car = readAdminForm();
            const existingId = document.getElementById('carId')?.value;

            if (!car.title || !car.make || !car.priceDisplay || !car.description) {
                return;
            }

            (async () => {
                if (existingId) {
                    car.id = existingId;
                } else {
                    const baseId = slugify(car.title);
                    const cars = await getCars();
                    const isDuplicate = cars.some((entry) => entry.id === baseId);
                    car.id = isDuplicate ? `${baseId}-${Date.now().toString(36)}` : baseId;
                }

                await saveCar(car);
                await renderAdminPanel();
                clearForm();
            })().catch((error) => {
                console.error(error);
            });
        });

        list.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');

            if (!button) {
                return;
            }

            const card = button.closest('[data-id]');

            if (!card) {
                return;
            }

            (async () => {
                const cars = await getCars();
                const car = cars.find((entry) => entry.id === card.dataset.id);

                if (!car) {
                    return;
                }

                if (button.dataset.action === 'edit') {
                    setAdminFormValues(car);
                    if (saveButton) {
                        saveButton.textContent = 'Wijzigingen opslaan';
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }

                if (button.dataset.action === 'delete') {
                    const confirmed = window.confirm(`Verwijder ${car.title}?`);

                    if (!confirmed) {
                        return;
                    }

                    await deleteCar(car.id);
                    await renderAdminPanel();
                    clearForm();
                }
            })().catch((error) => {
                console.error(error);
            });
        });

        if (resetFormButton) {
            resetFormButton.addEventListener('click', () => {
                clearForm();
            });
        }

        if (resetDemoButton) {
            resetDemoButton.addEventListener('click', () => {
                const confirmed = window.confirm('Herstel de demo voorraad en overschrijf je lokale wijzigingen?');

                if (!confirmed) {
                    return;
                }

                (async () => {
                    await resetCars();
                    await renderAdminPanel();
                    clearForm();
                })().catch((error) => {
                    console.error(error);
                });
            });
        }

        await renderAdminPanel();
    }

    async function initialize() {
        setupNavbar();
        setupContactForm();
        await Promise.all([
            setupInventoryPage(),
            setupCarDetailPage(),
            setupAdminPage(),
        ]);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initialize().catch((error) => console.error(error));
        });
    } else {
        initialize().catch((error) => console.error(error));
    }
})();
