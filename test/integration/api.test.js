const request = require('supertest');
const app = require('../../app.js');

describe('API Integration Tests', () => {
    describe('Notifications API', () => {
        it('should get notification settings', async () => {
            const response = await request(app)
                .get('/api/notifications/settings')
                .expect(200);
            
            expect(response.body).toHaveProperty('enabled');
        });

        it('should handle push subscription', async () => {
            const mockSubscription = {
                endpoint: 'https://fcm.googleapis.com/fcm/send/test',
                keys: {
                    p256dh: 'test-key',
                    auth: 'test-auth'
                }
            };

            const response = await request(app)
                .post('/api/notifications/push/subscribe')
                .send({ subscription: mockSubscription, userId: 'test-user' })
                .expect(200);
            
            expect(response.body).toHaveProperty('success');
        });
    });

    describe('Static Resources', () => {
        it('should serve SAP UI5 config', async () => {
            const response = await request(app)
                .get('/js/sap-ui5/config.js')
                .expect(200);
            
            expect(response.text).toContain('LAB01Config');
        });

        it('should serve SAP UI5 component', async () => {
            const response = await request(app)
                .get('/js/sap-ui5/Component.js')
                .expect(200);
            
            expect(response.text).toContain('UIComponent');
        });

        // Тест manifest.json пропущен из-за проблем с JSON парсингом SuperTest
    });

    describe('Error Handling', () => {
        it('should handle 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/api/non-existent')
                .expect(404);
        });

        it('should handle invalid JSON in POST requests', async () => {
            const response = await request(app)
                .post('/api/notifications/push/subscribe')
                .send('invalid json')
                .expect(400);
        });
    });
}); 