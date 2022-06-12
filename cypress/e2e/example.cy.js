describe('example', () => {
    it('should work', () => {
        cy.visit('/');
        cy.contains('h2', 'Kirjaudu sisään');
    });
});
