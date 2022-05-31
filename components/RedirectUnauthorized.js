import { useSession } from "next-auth/react"


const RedirectUnauthorized = ({router, children}) => {
    
    const {data: session} = useSession() 
    const isBrowser = () => typeof window !== "undefined"
    
    if(!session && isBrowser() && router.pathname !== '/login'){
        router.push('/login')
    }

    if(session || router.pathname == '/login'){return(children)}
    else{return(<>Ladataan...</>)}
    

} 

export default RedirectUnauthorized
