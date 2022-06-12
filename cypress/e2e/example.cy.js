describe('example', () => {
    it('should work', () => {
        cy.visit('/');
        cy.contains('h1', 'Hello World!');
    });
});
