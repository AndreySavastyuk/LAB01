// Настройка тестового окружения
process.env.NODE_ENV = 'test';
process.env.PORT = '3001'; // Используем другой порт для тестов

// Настройка таймаутов для тестов
jest.setTimeout(30000);

// Подавление логов во время тестирования
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
});

afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
});

// Очистка после каждого теста
afterEach(() => {
    jest.clearAllMocks();
}); 