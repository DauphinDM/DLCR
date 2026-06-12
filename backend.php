<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const DB_HOST = '127.0.0.1';
const DB_PORT = '3306';
const DB_NAME = 'dlcr';
const DB_USER = 'root';
const DB_PASS = '';
const DB_CHARSET = 'utf8mb4';

$defaultCars = [
    [
        'id' => 'ford-focus-st',
        'title' => 'Ford Focus ST',
        'make' => 'Ford',
        'price' => 19950,
        'price_display' => '€ 19.950',
        'offer' => 'Betaalbare performance hatch',
        'year' => 2019,
        'mileage' => 82000,
        'mileage_display' => '82.000 km',
        'power' => 280,
        'power_display' => '280 PK',
        'transmission' => 'Handgeschakeld',
        'fuel' => 'Benzine',
        'drivetrain' => 'FWD',
        'body_type' => 'Hot hatch',
        'category' => 'young',
        'image' => 'assets/images/hero.png',
        'description' => 'Een leuke en betaalbare hot hatch voor jonge rijders die performance en uitstraling willen zonder meteen in het topsegment te zitten.',
    ],
    [
        'id' => 'bmw-m4-competition',
        'title' => 'BMW M4 Competition',
        'make' => 'BMW',
        'price' => 65500,
        'price_display' => '€ 65.500',
        'offer' => 'Performance coupe',
        'year' => 2021,
        'mileage' => 42000,
        'mileage_display' => '42.000 km',
        'power' => 510,
        'power_display' => '510 PK',
        'transmission' => 'Automaat',
        'fuel' => 'Benzine',
        'drivetrain' => 'RWD',
        'body_type' => 'Coupe',
        'category' => 'performance',
        'image' => 'assets/images/hero.png',
        'description' => 'Voor wie meer vermogen, uitstraling en een premium gevoel wil in een compacte maar serieuze performance coupe.',
    ],
    [
        'id' => 'porsche-911-carrera-restored',
        'title' => 'Porsche 911 Carrera',
        'make' => 'Porsche',
        'price' => 89900,
        'price_display' => '€ 89.900',
        'offer' => 'Restored icon',
        'year' => 1998,
        'mileage' => 120000,
        'mileage_display' => '120.000 km',
        'power' => 300,
        'power_display' => '300 PK',
        'transmission' => 'Handgeschakeld',
        'fuel' => 'Benzine',
        'drivetrain' => 'RWD',
        'body_type' => 'Coupe',
        'category' => 'premium',
        'image' => 'assets/images/restored.png',
        'description' => 'Een tijdloze 911 met gerestaureerde uitstraling, bedoeld voor liefhebbers die klassieke aanwezigheid willen met dagelijks karakter.',
    ],
    [
        'id' => 'ferrari-f8-tributo',
        'title' => 'Ferrari F8 Tributo',
        'make' => 'Ferrari',
        'price' => 299000,
        'price_display' => 'Op aanvraag',
        'offer' => 'Exotic on request',
        'year' => 2020,
        'mileage' => 12500,
        'mileage_display' => '12.500 km',
        'power' => 720,
        'power_display' => '720 PK',
        'transmission' => 'Automaat',
        'fuel' => 'Benzine',
        'drivetrain' => 'RWD',
        'body_type' => 'Supercar',
        'category' => 'exotic',
        'image' => 'assets/images/tuning.png',
        'description' => 'Een high-end supercar voor klanten die een uitgesproken auto willen met pure presence en serieuze performance.',
    ],
    [
        'id' => 'lamborghini-huracan-evo',
        'title' => 'Lamborghini Huracán EVO',
        'make' => 'Lamborghini',
        'price' => 329000,
        'price_display' => 'Op aanvraag',
        'offer' => 'Exotic delivery',
        'year' => 2020,
        'mileage' => 18000,
        'mileage_display' => '18.000 km',
        'power' => 640,
        'power_display' => '640 PK',
        'transmission' => 'Automaat',
        'fuel' => 'Benzine',
        'drivetrain' => 'AWD',
        'body_type' => 'Supercar',
        'category' => 'exotic',
        'image' => 'assets/images/tuning.png',
        'description' => 'Een opvallende supercar voor klanten die exclusiviteit willen zonder in te leveren op gebruiksplezier en uitstraling.',
    ],
];

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function slugify(string $value): string
{
    $value = trim($value);
    $transliterated = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if ($transliterated !== false) {
        $value = $transliterated;
    }

    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? $value;
    $value = trim($value, '-');

    return $value !== '' ? $value : 'car-' . substr(md5((string) microtime(true)), 0, 8);
}

function format_currency($value): string
{
    if ($value === null || $value === '') {
        return 'Op aanvraag';
    }

    return '€ ' . number_format((float) $value, 0, ',', '.');
}

function format_mileage($value): string
{
    if ($value === null || $value === '') {
        return 'N.v.t.';
    }

    return number_format((int) $value, 0, ',', '.') . ' km';
}

function connect_to_database(): PDO
{
    $baseOptions = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', DB_HOST, DB_PORT, DB_NAME, DB_CHARSET);

    try {
        return new PDO($dsn, DB_USER, DB_PASS, $baseOptions);
    } catch (PDOException $databaseException) {
        $adminDsn = sprintf('mysql:host=%s;port=%s;charset=%s', DB_HOST, DB_PORT, DB_CHARSET);
        $adminPdo = new PDO($adminDsn, DB_USER, DB_PASS, $baseOptions);
        $adminPdo->exec(sprintf('CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', DB_NAME));

        return new PDO($dsn, DB_USER, DB_PASS, $baseOptions);
    }
}

function ensure_schema(PDO $pdo, array $seedCars): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS cars (
            id VARCHAR(120) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            make VARCHAR(120) NOT NULL,
            price DECIMAL(12,2) NULL,
            price_display VARCHAR(120) NOT NULL,
            offer VARCHAR(255) NOT NULL,
            year SMALLINT NOT NULL,
            mileage INT NOT NULL,
            mileage_display VARCHAR(120) NOT NULL,
            power INT NOT NULL,
            power_display VARCHAR(120) NOT NULL,
            transmission VARCHAR(80) NOT NULL,
            fuel VARCHAR(80) NOT NULL,
            drivetrain VARCHAR(80) NOT NULL,
            body_type VARCHAR(120) NOT NULL,
            category VARCHAR(40) NOT NULL,
            image VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $count = (int) $pdo->query('SELECT COUNT(*) FROM cars')->fetchColumn();

    if ($count === 0) {
        seed_cars($pdo, $seedCars);
    }
}

function normalize_input_car(array $input, ?string $existingId = null): array
{
    $title = trim((string) ($input['title'] ?? ''));
    $make = trim((string) ($input['make'] ?? ''));
    $priceRaw = $input['price'] ?? null;
    $price = is_numeric($priceRaw) ? (float) $priceRaw : null;
    $priceDisplay = trim((string) ($input['priceDisplay'] ?? ''));
    $offer = trim((string) ($input['offer'] ?? 'Beschikbaar'));
    $year = (int) ($input['year'] ?? date('Y'));
    $mileageRaw = $input['mileage'] ?? null;
    $mileage = is_numeric($mileageRaw) ? (int) $mileageRaw : 0;
    $mileageDisplay = trim((string) ($input['mileageDisplay'] ?? ''));
    $powerRaw = $input['power'] ?? null;
    $power = is_numeric($powerRaw) ? (int) $powerRaw : 0;
    $powerDisplay = trim((string) ($input['powerDisplay'] ?? ''));
    $transmission = trim((string) ($input['transmission'] ?? 'N.v.t.'));
    $fuel = trim((string) ($input['fuel'] ?? 'N.v.t.'));
    $drivetrain = trim((string) ($input['drivetrain'] ?? 'N.v.t.'));
    $bodyType = trim((string) ($input['bodyType'] ?? 'Auto'));
    $category = trim((string) ($input['category'] ?? 'performance'));
    $image = trim((string) ($input['image'] ?? 'assets/images/hero.png'));
    $description = trim((string) ($input['description'] ?? ''));

    if ($title === '' || $make === '' || $offer === '' || $description === '') {
        throw new InvalidArgumentException('Verplichte velden ontbreken.');
    }

    $id = $existingId ?: trim((string) ($input['id'] ?? ''));
    $id = $id !== '' ? $id : slugify($title);

    if ($priceDisplay === '') {
        $priceDisplay = $price !== null && $price > 0 ? format_currency($price) : 'Op aanvraag';
    }

    if ($mileageDisplay === '') {
        $mileageDisplay = format_mileage($mileage);
    }

    if ($powerDisplay === '') {
        $powerDisplay = $power . ' PK';
    }

    return [
        'id' => $id,
        'title' => $title,
        'make' => $make,
        'price' => $price,
        'price_display' => $priceDisplay,
        'offer' => $offer,
        'year' => $year,
        'mileage' => $mileage,
        'mileage_display' => $mileageDisplay,
        'power' => $power,
        'power_display' => $powerDisplay,
        'transmission' => $transmission,
        'fuel' => $fuel,
        'drivetrain' => $drivetrain,
        'body_type' => $bodyType,
        'category' => $category,
        'image' => $image,
        'description' => $description,
    ];
}

function seed_cars(PDO $pdo, array $cars): void
{
    $pdo->exec('DELETE FROM cars');

    $statement = $pdo->prepare(
        'INSERT INTO cars (
            id, title, make, price, price_display, offer, year, mileage, mileage_display,
            power, power_display, transmission, fuel, drivetrain, body_type, category, image, description
        ) VALUES (
            :id, :title, :make, :price, :price_display, :offer, :year, :mileage, :mileage_display,
            :power, :power_display, :transmission, :fuel, :drivetrain, :body_type, :category, :image, :description
        )'
    );

    foreach ($cars as $car) {
        $payload = normalize_input_car($car, $car['id'] ?? null);
        $statement->execute($payload);
    }
}

function row_to_car(array $row): array
{
    return [
        'id' => $row['id'],
        'title' => $row['title'],
        'make' => $row['make'],
        'price' => $row['price'] !== null ? (float) $row['price'] : 0,
        'priceDisplay' => $row['price_display'] !== '' ? $row['price_display'] : 'Op aanvraag',
        'offer' => $row['offer'],
        'year' => (int) $row['year'],
        'mileage' => (int) $row['mileage'],
        'mileageDisplay' => $row['mileage_display'] !== '' ? $row['mileage_display'] : format_mileage($row['mileage']),
        'power' => (int) $row['power'],
        'powerDisplay' => $row['power_display'] !== '' ? $row['power_display'] : ((int) $row['power'] . ' PK'),
        'transmission' => $row['transmission'],
        'fuel' => $row['fuel'],
        'drivetrain' => $row['drivetrain'],
        'bodyType' => $row['body_type'],
        'category' => $row['category'],
        'image' => $row['image'],
        'description' => $row['description'],
    ];
}

function fetch_cars(PDO $pdo): array
{
    $rows = $pdo->query("SELECT * FROM cars ORDER BY FIELD(category, 'young', 'performance', 'premium', 'exotic'), price ASC, title ASC")->fetchAll();
    return array_map('row_to_car', $rows);
}

function fetch_car_by_id(PDO $pdo, string $id): ?array
{
    $statement = $pdo->prepare('SELECT * FROM cars WHERE id = :id LIMIT 1');
    $statement->execute(['id' => $id]);
    $row = $statement->fetch();

    return $row ? row_to_car($row) : null;
}

function save_car(PDO $pdo, array $input): array
{
    $existingId = trim((string) ($input['id'] ?? ''));
    $payload = normalize_input_car($input, $existingId !== '' ? $existingId : null);

    $statement = $pdo->prepare(
        'INSERT INTO cars (
            id, title, make, price, price_display, offer, year, mileage, mileage_display,
            power, power_display, transmission, fuel, drivetrain, body_type, category, image, description
        ) VALUES (
            :id, :title, :make, :price, :price_display, :offer, :year, :mileage, :mileage_display,
            :power, :power_display, :transmission, :fuel, :drivetrain, :body_type, :category, :image, :description
        )
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            make = VALUES(make),
            price = VALUES(price),
            price_display = VALUES(price_display),
            offer = VALUES(offer),
            year = VALUES(year),
            mileage = VALUES(mileage),
            mileage_display = VALUES(mileage_display),
            power = VALUES(power),
            power_display = VALUES(power_display),
            transmission = VALUES(transmission),
            fuel = VALUES(fuel),
            drivetrain = VALUES(drivetrain),
            body_type = VALUES(body_type),
            category = VALUES(category),
            image = VALUES(image),
            description = VALUES(description)'
    );

    $statement->execute($payload);

    return fetch_car_by_id($pdo, $payload['id']) ?? row_to_car($payload + ['price_display' => $payload['price_display'], 'mileage_display' => $payload['mileage_display'], 'power_display' => $payload['power_display'], 'body_type' => $payload['body_type']]);
}

function delete_car(PDO $pdo, string $id): bool
{
    $statement = $pdo->prepare('DELETE FROM cars WHERE id = :id');
    $statement->execute(['id' => $id]);

    return $statement->rowCount() > 0;
}

function counts(PDO $pdo): array
{
    $rows = $pdo->query("SELECT category, COUNT(*) AS total FROM cars GROUP BY category")->fetchAll();
    $result = [
        'total' => (int) $pdo->query('SELECT COUNT(*) FROM cars')->fetchColumn(),
        'accessible' => 0,
        'exotic' => 0,
    ];

    foreach ($rows as $row) {
        if (in_array($row['category'], ['young', 'performance'], true)) {
            $result['accessible'] += (int) $row['total'];
        }

        if ($row['category'] === 'exotic') {
            $result['exotic'] += (int) $row['total'];
        }
    }

    return $result;
}

function request_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        return $decoded;
    }

    parse_str($raw, $formData);
    return is_array($formData) ? $formData : [];
}

try {
    $pdo = connect_to_database();
    ensure_schema($pdo, $defaultCars);

    $action = $_GET['action'] ?? 'cars';

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'status') {
        json_response(['ok' => true, 'counts' => counts($pdo)]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'car') {
        $id = trim((string) ($_GET['id'] ?? ''));
        if ($id === '') {
            json_response(['ok' => false, 'error' => 'Geen auto-id ontvangen.'], 400);
        }

        $car = fetch_car_by_id($pdo, $id);
        if ($car === null) {
            json_response(['ok' => false, 'error' => 'Auto niet gevonden.'], 404);
        }

        json_response(['ok' => true, 'car' => $car]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'cars') {
        json_response(['ok' => true, 'cars' => fetch_cars($pdo)]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save') {
        $car = save_car($pdo, request_body());
        json_response(['ok' => true, 'car' => $car, 'counts' => counts($pdo)]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete') {
        $body = request_body();
        $id = trim((string) ($body['id'] ?? ''));

        if ($id === '') {
            json_response(['ok' => false, 'error' => 'Geen auto-id ontvangen.'], 400);
        }

        $deleted = delete_car($pdo, $id);
        json_response(['ok' => true, 'deleted' => $deleted, 'counts' => counts($pdo)]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'seed') {
        seed_cars($pdo, $defaultCars);
        json_response(['ok' => true, 'cars' => fetch_cars($pdo), 'counts' => counts($pdo)]);
    }

    json_response([
        'ok' => true,
        'message' => 'DLCR backend is actief.',
        'cars' => fetch_cars($pdo),
    ]);
} catch (Throwable $throwable) {
    json_response([
        'ok' => false,
        'error' => 'Backend fout: ' . $throwable->getMessage(),
    ], 500);
}