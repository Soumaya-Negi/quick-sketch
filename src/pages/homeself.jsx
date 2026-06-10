import { useState } from "react";
import { Navigate } from "react-router-dom";


const [name , setName] = useState("");

const createRoom = async () => {
    const response = await fetch("https//randomlink.com" , {
        Method : "POST",
        body : JSON.stringify({name})
    })
    const data = await response.json();
    navigate(`path` , {state : {name}})
};