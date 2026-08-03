import { useState } from "react";
import { Navigate } from "react-router-dom";




const createRoom = async () => {
    const [name , setName] = useState("");
    const response = await fetch("https://randomlink.com" , {
        method : "POST",
        body : JSON.stringify({name})
    })
    const data = await response.json();
    navigate(`path` , {state : {name}})
};