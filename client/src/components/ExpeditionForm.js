import { useFormik } from "formik";
import * as yup from "yup";
import { useAuth } from "../context and utility/AuthContext";
import { usePokemon } from "../context and utility/PokemonContext";
import { useState, useEffect } from "react";

function capitalizeFirstLetters(string) {
    return string.toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

function ExpeditionForm({ onAddExpedition, handleClick }) {
    const { user, setUser } = useAuth();
    const { pokemonData } = usePokemon();
    const [locales, setLocales] = useState([]);

    useEffect(() => {
        fetch('/locales')
            .then(res => res.json())
            .then(data => setLocales(data))
            .catch(error => console.error(error));
    }, []);

    const formSchema = yup.object().shape({
        date: yup.date().required("Enter the date of this expedition."),
        locale_id: yup.string().required("Please enter the locale of this expedition."),
        captures: yup.array().of(
            yup.object().shape({
              species: yup.object().shape({
                name: yup.string().required("Please enter a Pokémon name."),
                dex_number: yup.number().required("Enter a Pokémon name and Dex number will be auto-populated."),
                types: yup.string().required("Enter a Pokémon name and Types will be auto-populated."),
                shiny: yup.boolean().required("Please specify if the Pokémon is shiny.")
              })
            })
          )
    });

    const onSubmit = async(values, actions) => {
        try {
            const expeditionRes = await fetch(`/expeditions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    date: values.date,
                    locale_id: values.locale_id,
                    user_id: user.id,
                    captures: values.captures.map(capture =>({
                        species: {
                            name: capitalizeFirstLetters(capture.species.name),
                            dex_number: capture.species.dex_number,
                            shiny: capture.species.shiny,
                            types: capture.species.types.split(', ')
                        }
                    }))
                }),
            });
            if(expeditionRes.status >= 400) {
                const data = await expeditionRes.json();
                actions.setErrors(data.errors);
            };
            const expedition = await expeditionRes.json();
            onAddExpedition(expedition);
            const userRes = await fetch('/check_session');
            const data = await userRes.json();
            if(userRes.ok){
                setUser(data)
            }
            handleClick();
            actions.resetForm();
        } catch(error) {
            console.error(error)
        }
    };

    const {values, handleBlur, handleChange, handleSubmit, setFieldValue, touched, errors, isSubmitting} = useFormik({
        initialValues: {
            date: "",
            locale_id: "",
            captures: []
        },
        validationSchema: formSchema,
        onSubmit,
    });

    function addNewCapture() {
        const newCaptures = [...values.captures, { 
            species: {
                name: "", 
                dex_number: "", 
                types: "", 
                shiny: false 
            }
        }]
        setFieldValue("captures", newCaptures);
    };

    function removeCapture(index) {
        const newCaptures = values.captures.filter((_, i) => i !== index);
        setFieldValue("captures", newCaptures);
    }

    const speciesFetch = async (speciesName, i) => {

        if(speciesName && pokemonData) {
            const pokemon = pokemonData.find(poke => poke.name === speciesName)

            if(pokemon) {
                setFieldValue(`captures[${i}].species.dex_number`, pokemon.dex_number);
                const capitalizeTypes = pokemon.types.map(type => capitalizeFirstLetters(type)).join(', ');
                setFieldValue(`captures[${i}].species.types`, capitalizeTypes);
            } else {
                console.error('Species not found');
                setFieldValue(`captures[${i}].species.dex_number`, "");
                setFieldValue(`captures[${i}].species.types`, "");
            }
        }
    };

    function handleCaptureChange(e, i) {
        const { name, value } = e.target;
        const newCaptures = [...values.captures];
        newCaptures[i].species = {...newCaptures[i].species, [name]: value};
        setFieldValue("captures", newCaptures);
    };

    function handleNameChange(e, i) {
        handleChange(e);
        const speciesName = e.target.value.toLowerCase().replace(/\s+/g, '-');
        handleCaptureChange(e, i);

        if (speciesName) {
            speciesFetch(speciesName, i);
        }
    }    

    return (
        <form onSubmit={handleSubmit}>
            <label htmlFor="date">Date</label>
            <input
                value={values.date}
                onChange={handleChange}
                onBlur={handleBlur}
                type="date"
                id="date"
                className={errors.date && touched.date ? "input-error" : ""}
            />
            {errors.date && touched.date && <p className="error">{errors.date}</p>}
            <label htmlFor="locale">Locale</label>
            <select
                value={values.locale_id}
                onChange={handleChange}
                onBlur={handleBlur}
                id="locale_id" 
                type="text" 
                placeholder="Select the habitat's locale" 
                className={errors.locale_id && touched.locale_id ? "input-error" : ""}>
                    <option value="" hidden disabled>Select a locale</option>
                    {locales.map((locale) => (
                    <option key={locale.id} value={locale.id}>{locale.name} ({locale.region.name})</option>
                ))}
            </select>
            {errors.locale_id && touched.locale_id && <p className="error">{errors.locale_id}</p>}
            {values.captures.map((capture, index) => (
                <div key={index} className="form-capture">
                    <label htmlFor={`captures[${index}].species.name`}>Pokémon Name</label>
                    <input
                        id={`captures[${index}].species.name`}
                        name="name"
                        type="text"
                        placeholder="Enter species name here"
                        value={capture.species.name}
                        onChange={(e) => handleNameChange(e, index)}
                        onBlur={handleBlur}
                        className={errors.captures?.[index]?.species?.name && touched.captures?.[index]?.species?.name ? "input-error" : ""}
                    />
                    {errors.captures?.[index]?.species?.name && touched.captures?.[index]?.name && <p className="error">{errors.captures[index].species.name}</p>}
                    <label htmlFor={`captures[${index}].species.dex_number`}>Dex Number</label>
                    <input
                        id={`captures[${index}].species.dex_number`}
                        name="dex_number"
                        type="text"
                        placeholder="Dex Number will be autopopulated on name entry"
                        value={capture.species.dex_number}
                        readOnly
                        className={errors.captures?.[index]?.species?.dex_number && touched.captures?.[index]?.species?.dex_number ? "input-error" : ""}
                    />
                    {errors.captures?.[index]?.species?.dex_number && touched.captures?.[index]?.species?.dex_number && <p className="error">{errors.captures[index].species.dex_number}</p>}
                    <label htmlFor={`captures[${index}].species.types`}>Type(s)</label>
                    <input
                        id={`captures[${index}].species.types`}
                        name="types"
                        type="text"
                        placeholder="Type(s) will be autopopulated on name entry"
                        value={capture.species.types}
                        readOnly
                        className={errors.captures?.[index]?.species?.types && touched.captures?.[index]?.species?.types ? "input-error" : ""}
                    />
                    {errors.captures?.[index]?.species?.types && touched.captures?.[index]?.species?.types && <p className="error">{errors.captures[index].species.types}</p>}
                    <div>
                        <label>Shiny?</label>
                        <div className="radio-group">
                        <label htmlFor={`captures[${index}].species.shiny-yes`}>Yes</label>
                        <input
                            id={`captures[${index}].species.shiny-yes`}
                            type="radio"
                            name={`captures[${index}].species.shiny`}
                            value="true"
                            checked={capture.species.shiny === true}
                            onChange={(e) => {
                                setFieldValue(`captures[${index}].species.shiny`, true);
                            }}
                        />
                        <label htmlFor={`captures[${index}].species.shiny-no`}>No</label>
                        <input
                            id={`captures[${index}].species.shiny-no`}
                            type="radio"
                            name={`captures[${index}].species.shiny`}
                            value="false"
                            checked={capture.species.shiny === false}
                            onChange={(e) => {
                                setFieldValue(`captures[${index}].species.shiny`, false);
                            }}
                        />
                        {errors.captures?.[index]?.species?.shiny && touched.captures?.[index]?.species?.shiny && (
                            <p className="error">{errors.captures[index].species.shiny}</p>
                        )}
                        </div>
                    </div>
                    <button type="button" onClick={() => removeCapture(index)}>Remove Capture</button>
                </div>
            ))}
            <button type="button" onClick={addNewCapture}>Add New Capture</button>
            <button disabled={isSubmitting} type="submit">Submit</button>
        </form>
    )
};

export default ExpeditionForm;