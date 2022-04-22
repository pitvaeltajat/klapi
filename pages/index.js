import React from 'react';
import { PrismaClient } from '@prisma/client';
import Auth from './auth';

export async function getStaticProps() {
    const prisma = new PrismaClient();
    const users = await prisma.user.findMany();
    return {
        props: { users },
    };
}

const Index = ({ users }) => {
    return (
        <div>
            <Auth />
            <h1>Hello World</h1>
            {users.map((user) => (
                <p key={user.id}>{user.name}</p>
            ))}
        </div>
    );
};

export default Index;
