import { createContext, useState, useContext } from "react";
import AuthContext from "../context/AuthContext";
import { useNavigate } from 'react-router-dom';
import api from '../../api'

const GlobalContext = createContext();
console.log('Creating store context...')

export function GlobalContextProvider({children}){
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    // GLOBAL STATE OF THE APPLICATION 
    const [appList, setAppList] = useState([]); 
    const [currentApp, setCurrentApp] = useState(null);

    // Functions to be used to manipulate the global state of our application 

    // This function will load the lists of the current user.   
    const loadAppList = function(){
        async function getLists() {    
            let payload = {
                user: auth.user.email,
            }
            const response = await api.getAppList(payload);
            console.log('[STORE] Response: ', response);
            console.log('[STORE] Data: ',  response.data);
            // Set the app list with the new lists that were found! 
            setAppList(response.data);
            setCurrentApp(null);
            // // Push the dashboard to show the new app being made! 
            // navigate('/dashboard', { replace: true })
          }
          console.log()
        getLists();
    }

    // This function is for creating an application to S2A for the user. 
    const createApp = function(appName, userEmail, roleSheet){
        async function createApplication (appName, userEmail, roleSheet){
            let payload = {
                // Get the name of the app
                name: appName,
                // Using who is logged in, use the email of the user as the creator of this application 
                creator: userEmail,
                // This is the URL to that is going to be used to define the roles of the app. 
                roleMembershipSheet: roleSheet,
            };
            console.log('[STORE] Creating application... sending: ',payload)
            // Send the request with the payload and wait for a response back. 
            const response = await api.createApp(payload);
            console.log('[STORE] Created application...', response)
            // After application has been created, reload the app list. 
            navigate('/dashboard', { replace: true })
        }
        createApplication(appName, userEmail, roleSheet)
    }

    const setCurrentAppById = function(id) {
        async function setAppId(id) { 
            const response = await api.getAppById(id);
            console.log('[STORE] Getting application...', response);
            if (response.status === 200) {
                setCurrentApp(response.data);
            }
        }
        setAppId(id);
    }

    const renameApp = function(name) {
        async function renameApplication(name) {
            let payload = {
                appId: currentApp._id,
                newName: name,
            }
            const response = await api.renameApp(payload);
            console.log('[STORE] Renaming application...', response);
            if (response.status === 200) {
                setCurrentApp(response.data);
            }
        }
        renameApplication(name);
    }

    const publishApp = function() {
        async function publishApplication() {
            let payload = {
                appId: currentApp._id
            }
            const response = await api.publishApp(payload);
            console.log('[STORE] (Un)publishing application...', response);
            if (response.status === 200) {
                setCurrentApp(response.data);
            }
        }
        publishApplication()
    }

    // IF THIS GETS BIG WE MIGHT NEED A REDUCER
    const funcs = {
        appList, 
        setAppList, 
        currentApp, 
        setCurrentApp, 
        loadAppList, 
        createApp,
        setCurrentAppById,
        renameApp,
        publishApp,
    }

    return(
        <GlobalContext.Provider value={funcs}>
            {children}
        </GlobalContext.Provider>
    )

}

export default GlobalContext; 