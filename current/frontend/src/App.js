import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Grid, CircularProgress } from "@mui/material";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import { renderToString } from 'react-dom/server';
import Paper from '@mui/material/Paper';
import Box from "@mui/material/Box";
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from "@mui/material/DialogActions";
import Slide from '@mui/material/Slide';

// Icons
import CheckIcon from '@mui/icons-material/Check';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import EditIcon from '@mui/icons-material/Edit';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import WebIcon from '@mui/icons-material/Web';
import HistoryIcon from '@mui/icons-material/History';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import SearchIcon from '@mui/icons-material/Search';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DownloadIcon from '@mui/icons-material/Download';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import FingerprintIcon from '@mui/icons-material/Fingerprint';

// CSS
import "./index.css";

function App() {
  // Refs
  const tableRef = useRef(null)
  const gridRef = useRef(null)
  const containerRef = useRef(null)
  const txtFieldRef = useRef(null)
  const heatmapRef = useRef(null)

  // textData: textData from backend
  const [textData, setTextData] = useState()
  const [textDataReady, setTextDataReady] = useState(false)

  // aiAnswer: response from the ai model
  const [aiAnswer, setAiAnswer] = useState()
  const [aiAnswerUncleaned, setAiAnswerUncleaned] = useState()
  const [aiAnswerJson, setAiAnswerJson] = useState()
  const [aiAnswerReady, setAiAnswerReady] = useState(false)
  const [aiStatus, setAiStatus] = useState("idle")

  // aiAnswerOld: save old responses for revert functionality
  const [aiAnswerOld, setAiAnswerOld] = useState([])
  const [aiAnswerUncleanedOld, setAiAnswerUncleanedOld] = useState([])
  const [aiAnswerJsonOld, setAiAnswerJsonOld] = useState([])
  const [aiAnswerSaved, setAiAnswerSaved] = useState(false)

  // the highlighted text
  const [hightlightedText, setHighlightedText] = useState("")

  // temperature setting of the ai model
  const [temperature, setTemperature] = useState(0.7)

  // systemStatus: status of the system
  const [systemStatus, setSystemStatus] = useState(0)
  const statusName = { 0: "normal", 1: "error" }

  // text highlighted by the user
  const [textSelected, setTextSelected] = useState([])

  // store all text data as list
  const [allTextData, setAllTextData] = useState([])
  const [textIndex, setTextIndex] = useState(0)
  const [currentTextIndex, setCurrentTextIndex] = useState(0)

  // store all ai answers as list
  const [allAiAnswers, setAllAiAnswers] = useState([])

  // set overview status and content
  const [showOverview, setShowOverview] = useState(false)
  const [overviewView, setOverviewView] = useState()

  // table that only considers the selected sections of the text
  const [selectionOnlyTable, setSelectionOnlyTable] = useState([])

  // popup/dialog screen
  const [showDialog, setShowDialog] = useState(false)
  const [dialogTitle, setDialogTitle] = useState([])
  const [dialogContent, setDialogContent] = useState([])
  const [dialogActions, setDialogActions] = useState([])

  // custom prompts
  const [customPrompt, setCustomPrompt] = useState("")
  const [editPrompt, setEditPrompt] = useState("")

  // single prompts and handling all
  const [singlePrompt, setSinglePrompt] = useState()
  const [singlePromptsReady, setSinglePromptsReady] = useState(false)
  const [allSinglePrompts, setAllSinglePrompts] = useState()

  // text sections for prompt and handling all
  const [promptTextstellen, setPromptTextstellen] = useState()
  const [promptTextstellenReady, setPromptTextstellenReady] = useState(false)
  const [allPromptTextstellen, setAllPromptTextstellen] = useState()

  // the queries used for building the json
  const [queries, setQueries] = useState(["Name", "Geburtsdatum", "Sterbedatum", "alle familiären Ereignisse", "alle schöpferische Akte"])

  // drawer status (left side)
  const [drawerOpen, setDrawerOpen] = useState(true)

  // define colors
  const [colors, setColors] = useState([])
  const [relevantProps, setRelevantProps] = useState([])

  // array of style properties for each word
  const [replacedTextHighlightsGlobal, setReplacedTextHighlightsGlobal] = useState([])
  const [replacedTextStyleGlobal, setReplacedTextStyleGlobal] = useState([])

  // render icons in table properly
  const statusCellRenderer = (params) => {
    let { value } = params
    if (value) {
      return renderToString(value)
    }
    return null
  }
  // define the columns of the ag-grid table
  const [textDataColumns, setTextDataColumns] = useState([{ field: "ID", headerName: "#", filter: true, width: 150 }, { field: "Text", filter: true, width: 500 }, { field: "StatusIcon", headerName: "Status", filter: true, cellRenderer: statusCellRenderer }])

  // get the user selected text in the text area
  // TODO handle with new word highlighting
  const handleTextSelect = () => {
    setSelectionOnlyTable([])
    let selection = window.getSelection()
    let key1 = selection.anchorNode.parentElement.getAttribute("key")
    let key2 = selection.focusNode.parentElement.getAttribute("key")
    let txtField = document.querySelector(".txt-field")
    // let key1Element = txtField.querySelectorAll(`[key*="${key1}"]`)
    // let key2Element = txtField.querySelectorAll(`[key*="${key2}"]`)

    let allProps = []

    if (key1 && key2) {
      for (let i = key1; i <= key2; i++) {
        let keyElement = txtField.querySelector(`[key*="${i}"]`)
        let keyElementClassName = keyElement.className
        let keyElementClassList = keyElementClassName.split(" ").filter((x) => { return x.match(/prop-(\d+)-(\d+)/) })
        allProps = allProps.concat(keyElementClassList)

      }
      allProps = [...new Set(allProps)]
      setTextSelected(allProps)
    }
  }

  // TODO calculate intersection of element with text container for position calculation
  const calculateIntersection = () => {
    if (containerRef.current) {
      let containerRect = containerRef.current.getBoundingClientRect()
      let windowHeight = window.innerHeight
      let visibleHeight = Math.min(containerRect.bottom, windowHeight) - Math.max(containerRect.top, 0)
      let ratio = visibleHeight / containerRect.height
      console.log(ratio)
    }
  }

  // reload the table on browser window resize
  window.addEventListener("resize", () => {
    if (gridRef.current) {
      gridRef.current.api.sizeColumnsToFit()
    }
  })

  // fetch the text from a file in the backend
  const fetchText = () => {
    const requestDescription = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    // fetch the biography text from the backend and add to array
    fetch("/get_text", requestDescription)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        let allTextDataTemp = allTextData
        allTextDataTemp.push({ ID: textIndex, Text: data, Status: "", StatusIcon: "" })
        setTextIndex(textIndex + 1)
        setAllTextData(allTextDataTemp)

        let allAiAnswersTemp = allAiAnswers
        allAiAnswersTemp.push({ ID: textIndex, Answer: "" })
        setAllAiAnswers(allAiAnswersTemp)

        setTextData(data);
        setTextDataReady(true);
        console.log("(TEXT " + currentTextIndex + ") Success:", data.substring(0, 100) + "...");
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  // handle clicking the fetch answer from backend (uses one prompt)
  const fetchAnswer = () => {
    const requestDescription = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "temperature": temperature
      })
    }

    setAiAnswerReady(false)
    setAiStatus("loading")

    if (aiAnswer) {
      saveCurrentAnswer()
    }

    fetch("/get_answer", requestDescription)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        setAiAnswer(data);
        setAiStatus(data["choices"][0]["finish_reason"])


        let allAiAnswersTemp = allAiAnswers.map((item) => {
          if (item["ID"] === currentTextIndex) {
            return { ...item, Answer: data }
          }
          return item
        })
        setAllAiAnswers(allAiAnswersTemp)

        setAiAnswerUncleaned(data["choices"][0]["message"]["content"])
        let dataCleaned = data["choices"][0]["message"]["content"].replace(/(\n)/gm, "");
        dataCleaned = dataCleaned.match(/\{[^{}]*\}/g)
        console.log("dataCleaned", dataCleaned)
        if (isJson(dataCleaned)) {
          setSystemStatus(0)
          dataCleaned = JSON.parse(dataCleaned)
          for (let e in dataCleaned) {
            if (e.startsWith("textstelle_")) {
              let newList = []
              newList.push(dataCleaned[e])
              dataCleaned[e] = newList
            }
          }
          console.log(dataCleaned)
          setAiAnswerJson(dataCleaned);
        } else {
          setSystemStatus(1)
          setAiAnswerJson(data["choices"][0]["message"]["content"]);
        }

        setAiAnswerReady(true);
        console.log("Success:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  // fetch ai answer for only one specified property: prop
  const fetchAnswerProperty = (prop) => {
    const requestDescription = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "prop": prop,
        "textData": textData,
        "temperature": temperature
      })
    }


    fetch("/get_answer_property", requestDescription)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        setSinglePrompt({ "promptName": prop, "data": data })
        console.log("Success:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  // get passages related to answer
  const fetchAnswerTextstelle = (prop, answer) => {
    const requestDescription = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "answer": answer,
        "textData": textData,
        "temperature": temperature,
        "prop": prop,
      })
    }


    fetch("/get_passage", requestDescription)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        setPromptTextstellen({ "promptName": prop, "data": data })
        console.log("Success:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  // handle clicking the dislike button
  const fetchDislikeAnswer = (dislike_name) => {
    const requestDescription = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "dislike_name": dislike_name,
        "temperature": temperature,
        "textData": textData,
        "aiAnswerJson": aiAnswerJson
      })
    }

    saveCurrentAnswer()

    setAiAnswerReady(false)
    setAiStatus("loading")
    fetch("/get_dislike_answer", requestDescription)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        console.log("dislike_data//response", data["choices"][0]["message"]["content"])
        setAiAnswer(data);
        setAiStatus(data["choices"][0]["finish_reason"])

        setAiAnswerUncleaned(data["choices"][0]["message"]["content"])
        let dataCleaned = data["choices"][0]["message"]["content"].replace(/(\n)/gm, "");
        dataCleaned = dataCleaned.match(/\{[^{}]*\}/g)
        console.log("dataCleaned", dataCleaned)
        if (isJson(dataCleaned)) {
          setSystemStatus(0)
          setAiAnswerJson(JSON.parse(dataCleaned));
        } else {
          setSystemStatus(1)
          setAiAnswerJson(data["choices"][0]["message"]["content"]);
        }

        setAiAnswerReady(true);
        console.log("Success:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  // handle fetching all answers seperately (better/more complete results)
  function handleFetchAnswerProperty() {
    if (aiAnswer) {
      saveCurrentAnswer()
    }
    for (let i in queries) {
      fetchAnswerProperty(queries[i])
    }
  }

  // handle fetching all passages
  function handleFetchPassages() {
    if (aiAnswer) {
      saveCurrentAnswer()
    }
    for (let i in queries) {
      fetchAnswerTextstelle(queries[i], aiAnswerJson[queries[i]])
    }
  }

  // load sample answer #1 for testing
  function loadSample() {
    let sampleJson = {
      "Name": [
        [
          "Gustav Klimt"
        ]
      ],
      "textstelle_Name": [
        [
          "Gustav, Maler. * Wien, 14. 7. 1862; † Wien, 6. 2. 1918."
        ],
        [
          "Von Gustav K.: Der Thespiskarren, Das Globe-Theater in London, Altar des Dionysos, Vor dem Theater in Taormina; auch führte er hier die Skizze seines Bruders Ernst K., Hanswurst auf dem Jahrmarkt, aus."
        ],
        [
          "Die konsequente Haltung K.s und der gleichgesinnten O. Wagner und J. Hoffmann führte 1904 zu ihrem Austritt aus der Vereinigung."
        ],
        [
          "K. tat in dieser Periode einen ähnlichen Schritt vom Impressionismus zu einer architekton. Bildform bei Verwendung von Jugendstilmotiven wie Hodler und Munch; völlig eigenartig ist jedoch der Aufbau des Bildes aus geometr. geordneter Kleinstruktur und die montagehafte Sicht des Raumes."
        ],
        [
          "K. war auch einer der bedeutendsten Zeichner seiner Zeit; seine auf mehrere Tausend schätzbaren Varianten auf den weiblichen Akt sind eher der Anschauung Degas’ als Rodins ähnlichen Blättern verwandt."
        ]
      ],
      "Geburtsdatum": [
        [
          "14. 7. 1862"
        ]
      ],
      "textstelle_Geburtsdatum": [
        [
          "Wien, 14. 7. 1862"
        ]
      ],
      "Sterbedatum": [
        [
          "6. 2. 1918"
        ]
      ],
      "textstelle_Sterbedatum": [
        [
          "† Wien, 6. 2. 1918."
        ]
      ],
      "alle familiären Ereignisse": [
        "Bruder der beiden Vorigen",
        "Zusammenarbeit mit seinem Bruder Ernst K. und F. Matsch bei dekorativen Aufträgen",
        "Lösung der beiden ersten „Fakultätsbilder“ im Geist des Symbolismus",
        "Austritt aus der Sezession",
        "Gründung der Wr. Werkstätte",
        "Sommerverbringen im Salzkammergut",
        "Tod und Leben (monumentales Frauenbild)",
        "Familienbildnisse: Adele Bloch-Bauer I und II, Mäda Primavesi, Elisabeth Bachofen-Echt, Friederike-Maria Beer, Berta Zuckerkandl"
      ],
      "textstelle_alle_familiären_Ereignisse": [
        [
          "Bruder der beiden Vorigen"
        ],
        [
          "stud. 1875–80 an der Kunstgewerbeschule des k. k. österr. Mus. für Kunst und Industrie unter Rieser, Minningerode, Hrachovina, Laufberger und Berger und führte auf Empfehlung des letzteren gem. mit seinem Bruder Ernst K. (s. d.) und F. Matsch eine Reihe von dekorativen Aufträgen aus (Kurhaus und Stadttheater Karlsbad, Stadttheater Reichenberg, Stadttheater Fiume, Hermesvilla Wien-Lainz [nach Skizzen von Makart], Nationaltheater Bukarest). Der Höhepunkt dieser Zusammenarbeit sind die monumentalen Deckenbilder in den beiden Stiegenhäusern des Burgtheaters in Wien, 1886–88."
        ],
        [
          "Die Lösung der beiden ersten „Fakultätsbilder“ im Geist des Symbolismus erregte den starken Widerspruch der konservativen Kritik und eines Teils der Fak. und K. kaufte die drei Gemälde 1904 vom Unterrichtsmin. zurück; dagegen zeigt die Jurisprudenz bereits die volle Entwicklung seines auf Flächeneffekt und autonomer Form gegründeten reifen Stils, bei Verwendung von Blattgold, nachimpressionist. Farbigkeit und starker Bildornamentalität."
        ],
        [
          "Mit der gleichzeitigen Gründung der Wr. Werkstätte — die von K. viele Anregungen holte — begannen auch die Hauptwerke der „goldenen“ Periode K.s, wie der in Marmor, Kupfer, Email und Edelsteinen ausgeführte Fries im von J. Hoffmann erbauten Palais Stocklet in Brüssel, 1905–1911, die Wasserschlangen, 1904–07, die Drei Lebensalter, 1905."
        ],
        [
          "K. hielt einen einsamen Platz in der österr. wie auch in der europ. Malerei: nach anfänglicher internationaler Anerkennung (1900 Goldene Medaille neben Menzel auf der Pariser Weltausst.) galt sein Werk nach dem Kubismus für die avantgardist. Kritik als überholt, und die offiziellen Kreise (wie auch die Zurückweisung seiner Ernennung zum Prof. an der Akad. der Bildenden Künste zeigt) lehnten seine Malerei ab."
        ],
        [
          "K. war auch einer der bedeutendsten Zeichner seiner Zeit; seine auf mehrere Tausend schätzbaren Varianten auf den weiblichen Akt sind eher der Anschauung Degas’ als Rodins ähnlichen Blättern verwandt. Ihr reiner Linienstil war einige Zeit auch mehr geschätzt als K.s komplizierte maler. Leistung, die ihn als den bedeutendsten österr. Maler der Jahrhundertwende erscheinen läßt."
        ],
        [
          "Bruder der beiden Vorigen"
        ],
        [
          "Monumentales Frauenbild: Tod und Leben."
        ],
        [
          "Familienbildnisse: Adele Bloch-Bauer I und II, Mäda Primavesi, Elisabeth Bachofen-Echt, Friederike-Maria Beer, Berta Zuckerkandl"
        ]
      ],
      "alle schöpferische Akte": [
        "Maler",
        "führte dekorative Aufträge aus",
        "schuf monumentale Deckenbilder im Burgtheater",
        "schuf Gemälde wie \"Der Thespiskarren\", \"Das Globe-Theater in London\", \"Altar des Dionysos\", \"Vor dem Theater in Taormina\"",
        "arbeitete an den monumentalen Panneaus für die Wiener Universität",
        "schuf den \"Beethoven-Fries\"",
        "gründete die Wiener Werkstätte",
        "schuf Werke wie den Fries im Palais Stocklet, die Wasserschlangen, die Drei Lebensalter, den Kuß, Tod und Leben, Frauenbildnisse wie Emilie Flöge, Fritza Riedler, Adele Bloch-Bauer I, Landschaften",
        "schuf symbolistische Kompositionen wie die Jungfrau, die Braut, Bildnisse wie Adele Bloch-Bauer II, Mäda Primavesi, Elisabeth Bachofen-Echt, Friederike-Maria Beer, Berta Zuckerkandl",
        "war einer der bedeutendsten Zeichner seiner Zeit"
      ],
      "textstelle_alle_schöpferische_Akte": [
        [
          "Klimt Gustav, Maler."
        ],
        [
          "Bruder der beiden Vorigen; stud. 1875–80 an der Kunstgewerbeschule des k. k. österr. Mus. für Kunst und Industrie unter Rieser, Minningerode, Hrachovina, Laufberger und Berger und führte auf Empfehlung des letzteren gem. mit seinem Bruder Ernst K. (s. d.) und F. Matsch eine Reihe von dekorativen Aufträgen aus (Kurhaus und Stadttheater Karlsbad, Stadttheater Reichenberg, Stadttheater Fiume, Hermesvilla Wien-Lainz [nach Skizzen von Makart], Nationaltheater Bukarest)."
        ],
        [
          "Der Höhepunkt dieser Zusammenarbeit sind die monumentalen Deckenbilder in den beiden Stiegenhäusern des Burgtheaters in Wien, 1886–88."
        ],
        [
          "Von Gustav K.: Der Thespiskarren, Das Globe-Theater in London, Altar des Dionysos, Vor dem Theater in Taormina; auch führte er hier die Skizze seines Bruders Ernst K., Hanswurst auf dem Jahrmarkt, aus."
        ],
        [
          "Das Hauptwerk dieser Periode sind die (1945 im Schloß Immendorf [N.Ö.] verbrannten) drei monumentalen Panneaus für die Wiener Univ.: Phil., Medizin und Jurisprudenz (Auftrag: 1896, erste Ausst. der Gemälde in der Sezession: 1900 bzw. 1901 und 1903 — doch arbeitete K. an ihnen bis um 1907)."
        ],
        [
          "Die Lösung der beiden ersten „Fakultätsbilder“ im Geist des Symbolismus erregte den starken Widerspruch der konservativen Kritik und eines Teils der Fak. und K. kaufte die drei Gemälde 1904 vom Unterrichtsmin. zurück;"
        ],
        [
          "Gemälde in der Sezession: 1900 bzw. 1901 und 1903 — doch arbeitete K. an ihnen bis um 1907)."
        ],
        [
          "Der Makartsche Stil der Frühwerke machte bereits hier engl. und französ. Einflüssen Platz und K. emanzipierte sich vom Geist der Wr. Eklektik in den Interkolumnien- und Zwickelbildern des Kunsthist. Mus. in Wien (1890) fast vollständig."
        ],
        [
          "schuf monumentale Frauenbildnisse wie Emilie Flöge, 1902, Hist. Mus. der Stadt Wien, Fritza Riedler, 1906,Österr. Galerie, Wien, Adele Bloch-Bauer I, 1908, Österr. Galerie, Wien, und eine Reihe von Landschaften in Quadratformat, die meisten im Salzkammergut — wo K. die Sommer seit 1897 verbrachte — entstanden."
        ],
        [
          "gründete die Wiener Werkstätte — die von K. viele Anregungen holte — begannen auch die Hauptwerke der „goldenen“ Periode K.s, wie der in Marmor, Kupfer, Email und Edelsteinen ausgeführte Fries im von J. Hoffmann erbauten Palais Stocklet in Brüssel, 1905–1911, die Wasserschlangen, 1904–07, die Drei Lebensalter, 1905, Galleria Nazionale d’Arte Moderna, Rom, der Kuß, 1908, Österr. Galerie, Wien, Tod und Leben, 1908–16, Privatbesitz, monumentale Frauenbildnisse wie Emilie Flöge, 1902, Hist. Mus. der Stadt Wien, Fritza Riedler, 1906,Österr. Galerie, Wien, Adele Bloch-Bauer I, 1908, Österr. Galerie, Wien, und eine Reihe von Landschaften in Quadratformat, die meisten im Salzkammergut — wo K. die Sommer seit 1897 verbrachte — entstanden."
        ],
        [
          "Gemälde in der Sezession: 1900 bzw. 1901 und 1903 — doch arbeitete K. an ihnen bis um 1907)."
        ],
        [
          "schuf symbolistische Kompositionen wie die Jungfrau, 1913, Národni Galerie, Prag, die Braut, 1917–18, Privatbesitz, Bildnisse wie Adele Bloch-Bauer II, 1912, Österr. Galerie, Wien, Mäda Primavesi, 1912, Privatbesitz, Elisabeth Bachofen-Echt, 1914–15, Privatbesitz, Friederike-Maria Beer, 1916, Privatbesitz, Berta Zuckerkandl, 1918, Privatbesitz, und Landschaften (nun häufig mit architekton. und Parkmotiven) halten auch jetzt die Waage; ihre gesteigerte Farbigkeit verbirgt jedoch kaum einige tiefere und trag. Noten."
        ],
        [
          "Gemälde in der Sezession: 1900 bzw. 1901 und 1903 — doch arbeitete K. an ihnen bis um 1907)."
        ]
      ]
    }

    let sampleJson2 = {
      "id": "chatcmpl-7yOzbds6B12GY1LIuksNLqwASArb0",
      "object": "chat.completion",
      "created": 1694630107,
      "model": "gpt-3.5-turbo-0613",
      "choices": [
        {
          "index": 0,
          "message": {
            "role": "assistant",
            "content": sampleJson
          },
          "finish_reason": "stop"
        }
      ],
      "usage": {
        "prompt_tokens": 1928,
        "completion_tokens": 314,
        "total_tokens": 2242
      }
    }

    setAiAnswer(sampleJson2);
    setAiStatus("stop")

    // setAiAnswerUncleaned()
    setAiAnswerJson(sampleJson)
    setSystemStatus(0)
    setAiAnswerReady(true)
  }

  // load sample answer #2 for testing
  function loadSample2() {
    let sampleJson = {
      "Name": [
        [
          "Gustav Klimt"
        ]
      ],
      "textstelle_Name": [
        [
          "Klimt Gustav"
        ]
      ],
      "Geburtsdatum": [
        [
          "14-7-1862"
        ]
      ],
      "textstelle_Geburtsdatum": [
        [
          "Wien, 14. 7. 1862"
        ]
      ],
      "Sterbedatum": [
        [
          "6. 2. 1918"
        ]
      ],
      "textstelle_Sterbedatum": [
        [
          "† Wien, 6. 2. 1918"
        ]
      ],
      "alle familiären Ereignisse": [
        "Bruder der beiden Vorigen (gemeint sind Gustav Klimt und Ernst Klimt)",
        "Gemeinsame Zusammenarbeit mit seinem Bruder Ernst Klimt und F. Matsch bei dekorativen Aufträgen",
        "Auseinandersetzung mit den Tendenzen der Moderne in Frankreich und Deutschland",
        "Erster Präsident der Wiener Sezession",
        "Erwerb der drei monumentalen Panneaus für die Wiener Universität von 1904",
        "Austritt aus der Wiener Sezession im Jahr 1904",
        "Gründung der Wiener Werkstätte",
        "Entstehung der Hauptwerke in der \"goldenen\" Periode",
        "Späte Entwicklung ab ca. 1909 mit verstärkten expressiven Elementen"
      ],
      "textstelle_alle_familiären_Ereignisse": [
        [
          "stud. 1875–80 an der Kunstgewerbeschule des k. k. österr. Mus. für Kunst und Industrie unter Rieser, Minningerode, Hrachovina, Laufberger und Berger und führte auf Empfehlung des letzteren gem. mit seinem Bruder Ernst K. (s. d.) und F. Matsch eine Reihe von dekorativen Aufträgen aus (Kurhaus und Stadttheater Karlsbad, Stadttheater Reichenberg, Stadttheater Fiume, Hermesvilla Wien-Lainz [nach Skizzen von Makart], Nationaltheater Bukarest)."
        ],
        [
          "Der Höhepunkt dieser Zusammenarbeit sind die monumentalen Deckenbilder in den beiden Stiegenhäusern des Burgtheaters in Wien, 1886–88."
        ],
        [
          "Die 90er Jahre waren von einer Auseinandersetzung mit den Tendenzen der Moderne in Frankreich und Deutschland, so mit Whistler, dem „Stimmungsimpressionismus“ und dem Jugendstil erfüllt."
        ],
        [
          "1897 wurde K. zum ersten Präs. der Wr. Sezession gewählt und galt als der repräsentative Vertreter der Moderne in der österr. Malerei."
        ],
        [
          "Das Hauptwerk dieser Periode sind die (1945 im Schloß Immendorf [N.Ö.] verbrannten) drei monumentalen Panneaus für die Wiener Univ.: Phil., Medizin und Jurisprudenz (Auftrag: 1896, erste Ausst. der Gemälde in der Sezession: 1900 bzw. 1901 und 1903 — doch arbeitete K. an ihnen bis um 1907)."
        ],
        [
          "Die Lösung der beiden ersten „Fakultätsbilder“ im Geist des Symbolismus erregte den starken Widerspruch der konservativen Kritik und eines Teils der Fak. und K. kaufte die drei Gemälde 1904 vom Unterrichtsmin. zurück;"
        ],
        [
          "Mit der gleichzeitigen Gründung der Wr. Werkstätte — die von K. viele Anregungen holte — begannen auch die Hauptwerke der „goldenen“ Periode K.s, wie der in Marmor, Kupfer, Email und Edelsteinen ausgeführte Fries im von J. Hoffmann erbauten Palais Stocklet in Brüssel, 1905–1911, die Wasserschlangen, 1904–07, die Drei Lebensalter, 1905, Galleria Nazionale d’Arte Moderna, Rom, der Kuß, 1908, Österr. Galerie, Wien, Tod und Leben, 1908–16, Privatbesitz, monumentale Frauenbildnisse wie Emilie Flöge, 1902, Hist. Mus. der Stadt Wien, Fritza Riedler, 1906,Österr. Galerie, Wien, Adele Bloch-Bauer I, 1908, Österr. Galerie, Wien, und eine Reihe von Landschaften in Quadratformat, die meisten im Salzkammergut — wo K. die Sommer seit 1897 verbrachte — entstanden."
        ],
        [
          "Nach Aufstellung des „Beethoven-Frieses“ in der Klinger-Ausst. der Sezession (1902) verschärften sich die Gegensätze noch mehr zu den offiziellen und Hofkreisen und auch innerhalb der Sezession."
        ],
        [
          "Die konsequente Haltung K.s und der gleichgesinnten O. Wagner und J. Hoffmann führte 1904 zu ihrem Austritt aus der Vereinigung."
        ],
        [
          "Symbolist. Kompositionen wie die Jungfrau, 1913, Národni Galerie, Prag, die Braut, 1917–18, Privatbesitz, Bildnisse wie Adele Bloch-Bauer II, 1912, Österr. Galerie, Wien, Mäda Primavesi, 1912, Privatbesitz, Elisabeth Bachofen-Echt, 1914–15, Privatbesitz, Friederike-Maria Beer, 1916, Privatbesitz, Berta Zuckerkandl, 1918, Privatbesitz, und Landschaften (nun häufig mit architekton. und Parkmotiven) halten auch jetzt die Waage; ihre gesteigerte Farbigkeit verbirgt jedoch kaum einige tiefere und trag. Noten."
        ]
      ],
      "alle schöpferische Akte": [
        "Gustav Klimt, Maler",
        "stud. an der Kunstgewerbeschule",
        "führte dekorative Aufträge aus",
        "Monumentale Deckenbilder im Burgtheater",
        "Gemälde: Der Thespiskarren, Das Globe-Theater in London, Altar des Dionysos, Vor dem Theater in Taormina",
        "Interkolumnien- und Zwickelbilder im Kunsthist. Mus. in Wien",
        "Orientierung zu den Praeraffaeliten",
        "Erster Präsident der Wr. Sezession",
        "Monumentale Panneaus für die Wiener Univ.",
        "\"goldene\" Periode: Fries im Palais Stocklet, Wasserschlangen, Drei Lebensalter, Der Kuß, Tod und Leben, Frauenbildnisse, Landschaften",
        "Verstärkung der expressiven Elemente in der späten Entwicklung",
        "Symbolistische Kompositionen und Bildnisse",
        "Einsamer Platz in der österr. und europ. Malerei",
        "Bedeutender Zeichner"
      ],
      "textstelle_alle_schöpferische_Akte": [
        [
          "Klimt Gustav, Maler."
        ],
        [
          "Stud. 1875–80 an der Kunstgewerbeschule des k. k. österr. Mus. für Kunst und Industrie unter Rieser, Minningerode, Hrachovina, Laufberger und Berger und führte auf Empfehlung des letzteren gem. mit seinem Bruder Ernst K. (s. d.) und F. Matsch eine Reihe von dekorativen Aufträgen aus (Kurhaus und Stadttheater Karlsbad, Stadttheater Reichenberg, Stadttheater Fiume, Hermesvilla Wien-Lainz [nach Skizzen von Makart], Nationaltheater Bukarest)."
        ],
        [
          "Der Höhepunkt dieser Zusammenarbeit sind die monumentalen Deckenbilder in den beiden Stiegenhäusern des Burgtheaters in Wien, 1886–88."
        ],
        [
          "Von Gustav K.: Der Thespiskarren, Das Globe-Theater in London, Altar des Dionysos, Vor dem Theater in Taormina; auch führte er hier die Skizze seines Bruders Ernst K., Hanswurst auf dem Jahrmarkt, aus."
        ],
        [
          "Der Makartsche Stil der Frühwerke machte bereits hier engl. und französ. Einflüssen Platz und K. emanzipierte sich vom Geist der Wr. Eklektik in den Interkolumnien- und Zwickelbildern des Kunsthist. Mus. in Wien (1890) fast vollständig."
        ],
        [
          "K.s Orientierung zu den Praeraffaeliten führte zur Auflösung der Ateliergemeinschaft mit Matsch; die 90er Jahre waren von einer Auseinandersetzung mit den Tendenzen der Moderne in Frankreich und Deutschland, so mit Whistler, dem „Stimmungsimpressionismus“ und dem Jugendstil erfüllt."
        ],
        [
          "1897 wurde K. zum ersten Präs. der Wr. Sezession gewählt und galt als der repräsentative Vertreter der Moderne in der österr. Malerei."
        ],
        [
          "Das Hauptwerk dieser Periode sind die (1945 im Schloß Immendorf [N.Ö.] verbrannten) drei monumentalen Panneaus für die Wiener Univ.: Phil., Medizin und Jurisprudenz (Auftrag: 1896, erste Ausst. der Gemälde in der Sezession: 1900 bzw. 1901 und 1903 — doch arbeitete K. an ihnen bis um 1907)."
        ],
        [
          "Die Lösung der beiden ersten „Fakultätsbilder“ im Geist des Symbolismus erregte den starken Widerspruch der konservativen Kritik und eines Teils der Fak. und K. kaufte die drei Gemälde 1904 vom Unterrichtsmin. zurück; dagegen zeigt die Jurisprudenz bereits die volle Entwicklung seines auf Flächeneffekt und autonomer Form gegründeten reifen Stils, bei Verwendung von Blattgold, nachimpressionist. Farbigkeit und starker Bildornamentalität."
        ],
        [
          "Nach Aufstellung des „Beethoven-Frieses“ in der Klinger-Ausst. der Sezession (1902) verschärften sich die Gegensätze noch mehr zu den offiziellen und Hofkreisen und auch innerhalb der Sezession."
        ],
        [
          "Die konsequente Haltung K.s und der gleichgesinnten O. Wagner und J. Hoffmann führte 1904 zu ihrem Austritt aus der Vereinigung."
        ],
        [
          "Mit der gleichzeitigen Gründung der Wr. Werkstätte — die von K. viele Anregungen holte — begannen auch die Hauptwerke der „goldenen“ Periode K.s, wie der in Marmor, Kupfer, Email und Edelsteinen ausgeführte Fries im von J. Hoffmann erbauten Palais Stocklet in Brüssel, 1905–1911, die Wasserschlangen, 1904–07, die Drei Lebensalter, 1905, Galleria Nazionale d’Arte Moderna, Rom, der Kuß, 1908, Österr. Galerie, Wien, Tod und Leben, 1908–16, Privatbesitz, monumentale Frauenbildnisse wie Emilie Flöge, 1902, Hist. Mus. der Stadt Wien, Fritza Riedler, 1906,Österr. Galerie, Wien, Adele Bloch-Bauer I, 1908, Österr. Galerie, Wien, und eine Reihe von Landschaften in Quadratformat, die meisten im Salzkammergut — wo K. die Sommer seit 1897 verbrachte — entstanden."
        ],
        [
          "K. tat in dieser Periode einen ähnlichen Schritt vom Impressionismus zu einer architekton. Bildform bei Verwendung von Jugendstilmotiven wie Hodler und Munch; völlig eigenartig ist jedoch der Aufbau des Bildes aus geometr. geordneter Kleinstruktur und die montagehafte Sicht des Raumes."
        ],
        [
          "Die späte Entwicklung von ca. 1909 an kennzeichnet eine Verstärkung der expressiven Elemente, jedoch bei Bewahrung der K. eigenen großbürgerlich-eleganten Anschauung."
        ],
        [
          "Symbolist. Kompositionen wie die Jungfrau, 1913, Národni Galerie, Prag, die Braut, 1917–18, Privatbesitz, Bildnisse wie Adele Bloch-Bauer II, 1912, Österr. Galerie, Wien, Mäda Primavesi, 1912, Privatbesitz, Elisabeth Bachofen-Echt, 1914–15, Privatbesitz, Friederike-Maria Beer, 1916, Privatbesitz, Berta Zuckerkandl, 1918, Privatbesitz, und Landschaften (nun häufig mit architekton. und Parkmotiven) halten auch jetzt die Waage; ihre gesteigerte Farbigkeit verbirgt jedoch kaum einige tiefere und trag. Noten."
        ],
        [
          "K. hielt einen einsamen Platz in der österr. wie auch in der europ. Malerei: nach anfänglicher internationaler Anerkennung (1900 Goldene Medaille neben Menzel auf der Pariser Weltausst.) galt sein Werk nach dem Kubismus für die avantgardist. Kritik als überholt, und die offiziellen Kreise (wie auch die Zurückweisung seiner Ernennung zum Prof. an der Akad. der Bildenden Künste zeigt) lehnten seine Malerei ab."
        ],
        [
          "K. war auch einer der bedeutendsten Zeichner seiner Zeit; seine auf mehrere Tausend schätzbaren Varianten auf den weiblichen Akt sind eher der Anschauung Degas’ als Rodins ähnlichen Blättern verwandt."
        ]
      ]
    }


    let sampleJson2 = {
      "id": "chatcmpl-7yOzbds6B12GY1LIuksNLqwASArb0",
      "object": "chat.completion",
      "created": 1694630107,
      "model": "gpt-3.5-turbo-0613",
      "choices": [
        {
          "index": 0,
          "message": {
            "role": "assistant",
            "content": sampleJson
          },
          "finish_reason": "stop"
        }
      ],
      "usage": {
        "prompt_tokens": 1928,
        "completion_tokens": 314,
        "total_tokens": 2242
      }
    }

    setAiAnswer(sampleJson2);
    setAiStatus("stop")

    // setAiAnswerUncleaned()
    setAiAnswerJson(sampleJson)
    setSystemStatus(0)
    setAiAnswerReady(true)
  }

  // downloads the current ai answer as .txt file
  function downloadAnswer() {
    let url = window.URL.createObjectURL(
      new Blob([JSON.stringify(aiAnswerJson, null, 1)], { type: "text/plain" })
    )

    let link = document.createElement("a")
    let date = new Date()

    link.href = url
    link.download = ["answer", "json", date.getHours(), date.getMinutes(), date.getSeconds()].join("_") + ".txt"

    document.body.appendChild(link)
    link.click()
    link.parentNode.removeChild(link)
  }

  // handles the user's custom prompt
  const fetchPrompt = () => {
    const requestDescription = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "prompt": customPrompt,
        "temperature": temperature
      })
    }

    saveCurrentAnswer()

    setAiAnswerReady(false)
    setAiStatus("loading")
    fetch("/get_custom_prompt", requestDescription)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        console.log("Custom Prompt Response: ", data["choices"][0]["message"]["content"])
        setAiAnswer(data);
        setAiStatus(data["choices"][0]["finish_reason"])

        if (isJson(data["choices"][0]["message"]["content"])) {
          setSystemStatus(0)
          setAiAnswerJson(JSON.parse(data["choices"][0]["message"]["content"]));
        } else {
          setSystemStatus(1)
          setAiAnswerJson(data["choices"][0]["message"]["content"]);
        }

        setAiAnswerReady(true);
        console.log("Success:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  // TODO adjust to new system
  // handle dislike answer (without specifying problem)
  const fetchEdit = () => {
    const requestDescription = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "prompt": editPrompt,
        "temperature": temperature,
        "textData": textData,
        "aiAnswerJson": aiAnswerJson
      })
    }

    saveCurrentAnswer()

    setAiAnswerReady(false)
    setAiStatus("loading")
    fetch("/get_edit_answer", requestDescription)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        console.log("Edit Response: ", data["choices"][0]["message"]["content"])
        setAiAnswer(data);
        setAiStatus(data["choices"][0]["finish_reason"])

        setAiAnswerUncleaned(data["choices"][0]["message"]["content"])
        let dataCleaned = data["choices"][0]["message"]["content"].replace(/(\n)/gm, "");
        dataCleaned = dataCleaned.match(/\{[^{}]*\}/g)
        console.log("dataCleaned", dataCleaned)
        if (isJson(dataCleaned)) {
          setSystemStatus(0)
          setAiAnswerJson(JSON.parse(dataCleaned));
        } else {
          setSystemStatus(1)
          setAiAnswerJson(data["choices"][0]["message"]["content"]);
        }

        setAiAnswerReady(true);
        console.log("Success:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  // set the colors
  useEffect(() => {
    let theColors = []
    let theD3Colors = d3.scaleOrdinal(d3.schemeTableau10)
    for (let i in queries) {
      theColors.push(theD3Colors(i))
    }
    setColors(theColors)
  }, [queries, textData, textDataReady])

  // draw the heatmap
  useEffect(() => {
    if (heatmapRef.current) {
      let svg = d3.select(heatmapRef.current)
      drawHeatmap(svg)
    }
  }, [heatmapRef, replacedTextStyleGlobal])

  // handle hover over highlighted elements
  useEffect(() => {
    // select all elements with classes like prop-X*
    let propElements = document.querySelectorAll('[class*="prop-"]')

    // add all elements with classes like prop-X-Y to subPropelements
    let subPropElements = []
    let txtField = document.querySelector(".txt-field")

    propElements.forEach((e) => {
      let eClass = []
      if (e.nodeName === "rect") {
        eClass = e.className.baseVal.split(" ")
      } else {
        eClass = e.className.split(" ")
      }
      for (let eClassName of eClass) {
        if (eClassName.match(/prop-\d+-\d+/)) {
          subPropElements.push(e)
          break
        }
      }
    })

    // handle elements with classes like prop-X-Y
    subPropElements.forEach((propElement) => {
      let classes = []
      if (propElement.nodeName === "rect") {
        classes = propElement.className.baseVal.split(" ")
      } else {
        classes = propElement.className.split(" ")
      }

      let highlightedElements = []
      let relevantNumbers = []
      let numbers = []
      let currentNumber = 0
      for (let theClass of classes) {
        if (theClass.match(/prop-(\d+)-(\d+)/)) {
          let number0 = theClass.match(/prop-(\d+)-(\d+)/)[1]
          let number1 = theClass.match(/prop-(\d+)-(\d+)/)[2]
          numbers.push(number0 + "-" + number1)
          if (!relevantNumbers.includes(number0)) {
            relevantNumbers.push(number0)
          }
          for (let x of document.querySelectorAll(`.prop-${number0}-${number1}`)) {
            highlightedElements.push(x)
          }
        } else if (theClass.match(/high-prop-(\d+)/)) {
          let number = theClass.match(/high-prop-(\d+)/)[1]
          for (let x of document.querySelectorAll(`.prop-main-${number}`)) {
            highlightedElements.push(x)
          }
        }
      }

      // scroll to place in table / text
      propElement.addEventListener("click", () => {
        let isRect = propElement.nodeName.match("rect")
        if (propElement.nodeName.match("SPAN") || isRect) {
          scrollToTable(numbers[currentNumber % numbers.length])
          // if (isRect) {
          //   let i = propElement.id.split("-")[1]
          //   let targetElement = txtField.querySelector(`[key*="${i}"]`)
          //   scrollToTextPassage(targetElement)
          // }
          currentNumber++
        } else if (propElement.nodeName.match("LI")) {
          scrollToTextPassage(highlightedElements[0])
        }
      })

      propElement.addEventListener("mouseover", () => {
        highlightedElements.forEach((highlightedElement) => {
          highlightedElement.classList.add("highlighted-hover")
        })
        if (!propElement.nodeName.match("LI")) {
          setRelevantProps(relevantNumbers)
        }
      })

      propElement.addEventListener("mouseout", () => {
        highlightedElements.forEach((highlightedElement) => {
          highlightedElement.classList.remove("highlighted-hover")
        })
        if (!propElement.nodeName.match("LI")) {
          setRelevantProps([])
        }
      })
    })


    // handle elements with classes like prop-X
    propElements.forEach((propElement) => {
      if (!subPropElements.includes(propElement)) {
        let number = propElement.className.match(/prop-(\d+)/)[1]
        let highPropElements = document.querySelectorAll(`.high-prop-${number}`)

        propElement.addEventListener("mouseover", () => {
          highPropElements.forEach((highPropElement) => {
            highPropElement.classList.add("highlighted-hover")
          })
        })

        propElement.addEventListener("mouseout", () => {
          highPropElements.forEach((highPropElement) => {
            highPropElement.classList.remove("highlighted-hover")
          })
        })

      }
    })
  }, [aiAnswer, aiAnswerJson, aiAnswerReady, hightlightedText, replacedTextStyleGlobal]);

  // automatically fetch text data on initialization
  useEffect(() => {
    if (!textDataReady) {
      fetchText();
    }
  }, [textDataReady]);

  // TODO
  useEffect(() => {
    console.log("aiAnswer", aiAnswer)
  }, [aiAnswer])

  // TODO
  useEffect(() => {
    console.log("aiAnswerJson", aiAnswerJson)
  }, [aiAnswerJson]);

  // update the highlighted text when ai answer is ready
  useEffect(() => {
    if (aiAnswerReady && systemStatus === 0) {
      setAiStatus(aiAnswer["choices"][0]["finish_reason"])

      let sections = [];
      // calculate appropriate style for each passage
      for (let i = 1; i < Object.keys(aiAnswerJson).length; i += 2) {
        if (Object.keys(aiAnswerJson)[i].match("textstelle")) {
          let theColor = colors[parseInt(i / 2)]

          for (let stelle in aiAnswerJson[Object.keys(aiAnswerJson)[i]]) {
            sections.push({ textstelle: aiAnswerJson[Object.keys(aiAnswerJson)[i]][stelle], style: theColor, classId: "high-prop-" + (i - 1) + " prop-" + (i - 1) + "-" + (parseInt(stelle) + 1) })

          }
        }
      }

      let replacedText = textData;
      // initialize replacedTextHighlights and replacedTextStyle with empty arrays
      let replacedTextHighlights = textData.split(/\s+/).map((x, i) => {
        return []
      })

      let replacedTextStyle = textData.split(/\s+/).map((x, i) => {
        return []
      })

      sections.forEach(section => {
        let { textstelle, style, classId } = section
        // if (Array.isArray(textstelle)) {
        // console.log(replacedTextHighlights)
        for (let e in textstelle) {
          let cleanedSearchText = String(textstelle[e]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          let regex = new RegExp(cleanedSearchText, 'g')
          // console.log(textstelle[e])

          let startIndex = -1
          let endIndex = -1

          // find passage in textData
          textData.replace(regex, (match, i) => {
            if (startIndex === -1) {
              startIndex = i
            }
            endIndex = startIndex + match.length - 1
            return match
          })

          // console.log(startIndex)
          // console.log(endIndex)
          // console.log(textData.substring(startIndex, endIndex + 1))
          // console.log(textData.substring(startIndex, endIndex + 1).split(/\s+/))
          let matchLength = textData.substring(startIndex, endIndex + 1).split(/\s+/).length
          // console.log(textData.substring(startIndex, endIndex + 1).split(/\s+/).length)
          // console.log(textData.substring(0, startIndex))
          let wordsToMatch = textData.substring(0, startIndex).split(/\s+/).length
          // console.log(textData.substring(0, startIndex).split(/\s+/).length)
          let matchStartWordIndex = textData.substring(0, startIndex).split(/\s+/).length - 1
          let matchEndWordIndex = textData.substring(0, startIndex).split(/\s+/).length - 1 + textData.substring(startIndex, endIndex + 1).split(/\s+/).length - 1
          // console.log(textData.split(/\s+/)[textData.substring(0, startIndex).split(/\s+/).length - 1])
          // console.log(textData.split(/\s+/)[textData.substring(0, startIndex).split(/\s+/).length - 2 + textData.substring(startIndex, endIndex + 1).split(/\s+/).length])

          for (let i = matchStartWordIndex; i <= matchEndWordIndex; i++) {
            replacedTextHighlights[i].push(classId)
            replacedTextStyle[i].push(style)
          }

          // try {
          //   replacedText = replacedText.replace(regex, `<span style="background-color: ${style}" class="highlighted ${classId}">${String(textstelle[e])}</span>`)
          // } catch (er) {
          //   console.error("ERROR WHILE REPLACING TEXTSTELLE", er)
          // }
        }

        // } else {
        //   console.log("isNOTArray")
        //   let cleanedSearchText = String(textstelle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        //   let regex = new RegExp(cleanedSearchText, 'g')
        //   console.log("--- textstelle", textstelle)
        //   console.log(textstelle)
        //   try {
        //     replacedText = replacedText.replace(regex, `<span style="${style}" class="highlighted ${classId}">${String(textstelle)}</span>`)
        //   } catch (er) {
        //     console.error("ERROR WHILE REPLACING TEXTSTELLE", er)
        //   }
        // }

      });

      let replacedTextHighlightsLocal = replacedTextHighlights.map((x, i) => {
        let newList = []
        x.forEach((y) => {
          y.split(" ").forEach((z) => {
            newList.push(z)
          })
        })
        return [...new Set(newList)].join(" ")
      })
      setReplacedTextHighlightsGlobal(replacedTextHighlightsLocal)

      let replacedTextStyleLocal = replacedTextStyle.map((x, i) => {
        let replacedTextStyleSet = [...new Set(x)]
        return replacedTextStyleSet
      })
      setReplacedTextStyleGlobal(replacedTextStyleLocal)

      // split text by whitespace
      let textDataSplit = textData.split(/\s+/)
      replacedText = textDataSplit.map((x, i) => {
        let finalText = ""

        if (i === 0) {
          if (replacedTextHighlights[0].length > 0) {
            if (replacedTextStyleLocal[0].length > 1) {
              finalText += `<span style="border: 0.1vh solid black; background-image: linear-gradient(${replacedTextStyleLocal[0]})" class="highlighted ${replacedTextHighlightsLocal[0]}">`
            } else {
              finalText += `<span style="border: 0.1vh solid black; background-color: ${replacedTextStyleLocal[0]}" class="highlighted ${replacedTextHighlightsLocal[0]}">`
            }
          } else {
            finalText += `<span style="border: 0.1vh solid black">`
          }
          finalText += `<span key=0>${x}</span>`
        }

        if (i > 0 && i < textDataSplit.length && (replacedTextHighlightsLocal[i - 1].split(" ").sort().toString() !== replacedTextHighlightsLocal[i].split(" ").sort().toString())) {
          finalText += `</span>`
          if (replacedTextHighlights[i].length > 0) {
            if (replacedTextStyleLocal[i].length > 1) {
              finalText += `<span style="border: 0.1vh solid black; background-image: linear-gradient(${replacedTextStyleLocal[i]})" class="highlighted ${replacedTextHighlightsLocal[i]}">`
            } else {
              finalText += `<span style="border: 0.1vh solid black; background-color: ${replacedTextStyleLocal[i]}" class="highlighted ${replacedTextHighlightsLocal[i]}">`
            }
          } else {
            finalText += `<span style="border: 0.1vh solid black">`
          }
          finalText += `<span key=${i}>${x}</span>`
        } else if (i > 0 && i < textDataSplit.length && (replacedTextHighlightsLocal[i - 1].split(" ").sort().toString() === replacedTextHighlightsLocal[i].split(" ").sort().toString())) {
          finalText += `<span key=${i}>${x}</span>`
        }

        // if (i === 0) {
        //   finalText += '<span style="border: 0.1vh solid black">'
        // }

        // if (i > 0 && i < textDataSplit.length && (replacedTextStyleLocal[i - 1].sort().toString() !== replacedTextStyleLocal[i].sort().toString())) {
        //   finalText += '<span style="border: 0.1vh solid black">'
        // }

        // if (replacedTextHighlights[i].length >= 1) {
        //   if (replacedTextStyleLocal[i].length > 1) {
        //     finalText += `<span key=${i} style="background-image: linear-gradient(${replacedTextStyleLocal[i]})" class="highlighted ${replacedTextHighlightsLocal[i]}">${x} </span>`
        //   } else {
        //     finalText += `<span key=${i} style="background-color: ${replacedTextStyleLocal[i]}" class="highlighted ${replacedTextHighlightsLocal[i]}">${x} </span>`
        //   }
        // } else {
        //   finalText += `<span key=${i}>${x}</span>`
        // }

        // if (i < (textDataSplit.length - 1) && (replacedTextStyleLocal[i].sort().toString() !== replacedTextStyleLocal[i + 1].sort().toString())) {
        //   finalText += '</span>'
        // }


        // if (i % 10 === 0) {
        //   finalText = finalText + " <br />"
        // }
        return finalText
      }).join(" ")

      setHighlightedText(replacedText)
      // console.log(replacedTextHighlights)

      let allTextDataTemp = allTextData.map((item) => {
        if (item["ID"] === currentTextIndex) {
          return { ...item, HighText: replacedText }
        }
        return item
      })
      setAllTextData(allTextDataTemp)


    } else if (aiAnswerReady && systemStatus === 1) {
      setAiStatus(aiAnswer["choices"][0]["finish_reason"])
      setHighlightedText(textData)

      let allTextDataTemp = allTextData.map((item) => {
        if (item["ID"] === currentTextIndex) {
          return { ...item, HighText: textData }
        }
        return item
      })
      setAllTextData(allTextDataTemp)
    }
  }, [aiAnswerReady, textData, aiAnswerJson, colors]);

  // update the status when ai status or text data changes
  useEffect(() => {
    let status;
    if (aiAnswerReady || aiStatus.match("stop")) {
      status = <CheckIcon style={{ color: "lime", verticalAlign: "middle" }} />;
    } else if (aiStatus === "loading") {
      status = <CircularProgress size="3vh" sx={{ color: "black", verticalAlign: "middle" }} />;
    } else {
      status = <b>{aiStatus.toUpperCase()}</b>
    }

    let allTextDataTemp = allTextData.map((item) => {
      if (item["ID"] === currentTextIndex) {
        return { ...item, Status: aiStatus, StatusIcon: status }
      }
      return item
    })
    setAllTextData(allTextDataTemp)

    // setAllTextData([{ ID: "0", Text: textData, Status: status }]);
  }, [aiStatus, textData]);


  // initialize and update the overview
  useEffect(() => {
    if (showOverview) {
      let displayText = []
      for (let i in allTextData) {
        let aName
        if (allTextData[i]["Status"] === "stop" && allAiAnswers.find(x => x["ID"] === allTextData[i]["ID"])["Answer"] !== "") {
          aName = JSON.parse(allAiAnswers.find(x => x["ID"] === allTextData[i]["ID"])["Answer"]["choices"][0]["message"]["content"].replace(/(\n)/gm, "").match(/\{[^{}]*\}/g))[queries[0]]
        }
        displayText.push(
          <Card key={"card-" + allTextData[i]["ID"]} sx={{ maxWidth: "30vh", maxHeight: "40vh", width: "30vh", margin: "1vh" }}>
            <CardContent style={{ padding: "1vh" }}>
              <Typography variant="button" style={{ fontSize: "2vh" }}>
                <span style={{ cursor: "pointer" }} onClick={setCurrentTextIndex(allTextData[i]["ID"])}>
                  {"Text #" + allTextData[i]["ID"]}
                </span>
              </Typography>
              {(allTextData[i]["Status"] === "stop" && allAiAnswers.find(x => x["ID"] === allTextData[i]["ID"])["Answer"] !== "") &&
                <Typography gutterBottom variant="h5" component="div" style={{ fontSize: "3vh" }}>
                  {aName}
                </Typography>}
              <Typography variant="body2" color="text.secondary" style={{ fontSize: "0.8vh", maxHeight: "30vh", overflow: "scroll" }}>
                {allTextData[i]["Status"] === "stop" ?
                  <span dangerouslySetInnerHTML={{ __html: allTextData[i]["HighText"] }} /> :
                  allTextData[i]["Text"]}
              </Typography>
            </CardContent >
            <CardActions>
              <small onClick={() => setCurrentTextIndex(allTextData[i]["ID"])} className="custom-button">SHOW</small>
            </CardActions>
          </Card >)
      }

      setOverviewView(displayText)
    }
  }, [showOverview, allAiAnswers, allTextData])

  // process customPrompt when ready
  useEffect(() => {
    if (customPrompt !== "") {
      fetchPrompt()
    }
  }, [customPrompt]);

  // process editPrompt when ready
  useEffect(() => {
    if (editPrompt !== "") {
      fetchEdit()
      setShowDialog(false)
    }
  }, [editPrompt]);

  // put together the JSON with singlePrompt
  useEffect(() => {
    if (singlePrompt !== undefined && singlePromptsReady) {
      // all single prompts are ready
      // console.log("singlePrompt", singlePrompt)
      // console.log("allSinglePrompts", allSinglePrompts)
      setAiAnswerReady(false)
      setAiStatus("loading")

      // create temporary chatgpt answer object and write all single prompts into content
      let singlePromptTemp = singlePrompt
      singlePromptTemp["data"]["choices"][0]["message"]["content"] = allSinglePrompts

      let sortedJson = {}
      for (let q in queries) {
        sortedJson[queries[q]] = singlePromptTemp["data"]["choices"][0]["message"]["content"][queries[q]]
      }

      singlePromptTemp["data"]["choices"][0]["message"]["content"] = sortedJson

      // write all query answers into the ai answer + set ai status
      setAiAnswer(singlePromptTemp["data"]);
      setAiStatus(singlePromptTemp["data"]["choices"][0]["finish_reason"])

      // write ai answer into all ai answers
      let allAiAnswersTemp = allAiAnswers.map((item) => {
        if (item["ID"] === currentTextIndex) {
          return { ...item, Answer: singlePromptTemp["data"] }
        }
        return item
      })
      setAllAiAnswers(allAiAnswersTemp)

      setAiAnswerJson(singlePromptTemp["data"]["choices"][0]["message"]["content"])
      setSystemStatus(0)
      setAiAnswerReady(true)

    } else if (singlePrompt !== undefined && !singlePromptsReady) {
      setAiStatus("loading")
      let answerList = handleListFormating(singlePrompt["data"]["choices"][0]["message"]["content"])
      let contentNew = {}
      contentNew[singlePrompt["promptName"]] = answerList
      // console.log("answerList for " + singlePrompt["promptName"], answerList)
      let allSinglePromptsTemp = { ...allSinglePrompts, ...contentNew }
      setAllSinglePrompts(allSinglePromptsTemp)
    }
  }, [singlePrompt, singlePromptsReady]);

  // set data ready when all single prompts have been processed
  useEffect(() => {
    // test if all single prompts are ready
    if (allSinglePrompts !== undefined && !singlePromptsReady && Object.keys(allSinglePrompts).includes(queries[queries.length - 1])) {
      setSinglePromptsReady(true)
    }
  }, [allSinglePrompts])

  // TODO automatically fetch passages when allSinglePrmpts and aiAnswerReady
  // useEffect(() => {
  //   if (allSinglePrompts !== undefined && aiAnswerReady && Object.keys(aiAnswerJson).length === queries.length) {
  //     handleFetchPassages()
  //   }
  // }, [allSinglePrompts, aiAnswerReady, aiAnswerJson])

  // put together the JSON with singlePrompt
  useEffect(() => {
    if (promptTextstellen !== undefined && promptTextstellenReady) {
      // all single prompts are ready
      // console.log("promptTextstellen", promptTextstellen)
      // console.log("allPromptTextstellen", allPromptTextstellen)
      setAiAnswerReady(false)
      setAiStatus("loading")

      let promptTextstellenTemp = promptTextstellen
      promptTextstellenTemp["data"]["choices"][0]["message"]["content"] = allPromptTextstellen

      let sortedJson = {}
      for (let q in queries) {
        sortedJson[queries[q]] = aiAnswer["choices"][0]["message"]["content"][queries[q]]
        sortedJson["textstelle_" + queries[q].split(" ").join("_")] = promptTextstellenTemp["data"]["choices"][0]["message"]["content"]["textstelle_" + queries[q].split(" ").join("_")]
      }

      promptTextstellenTemp["data"]["choices"][0]["message"]["content"] = sortedJson

      setAiAnswer(promptTextstellenTemp["data"]);
      setAiStatus(promptTextstellenTemp["data"]["choices"][0]["finish_reason"])

      let allAiAnswersTemp = allAiAnswers.map((item) => {
        if (item["ID"] === currentTextIndex) {
          return { ...item, Answer: promptTextstellenTemp["data"] }
        }
        return item
      })
      setAllAiAnswers(allAiAnswersTemp)

      // setAiAnswerUncleaned(singlePromptTemp["data"]["choices"][0]["message"]["content"])
      setAiAnswerJson(promptTextstellenTemp["data"]["choices"][0]["message"]["content"])
      setSystemStatus(0)
      setAiAnswerReady(true)

    } else if (promptTextstellen !== undefined && !promptTextstellenReady) {
      let arrayWithMoreArrays = handleArrayFormating(promptTextstellen["data"]["choices"][0]["message"]["content"])
      let answerList = arrayWithMoreArrays
      // for (let a in arrayWithMoreArrays) {
      //   for (let s in arrayWithMoreArrays[a]) {
      //     answerList.push(arrayWithMoreArrays[a][s])
      //   }
      // }
      // console.log("answerList is ", answerList)
      let contentNew = {}
      contentNew["textstelle_" + promptTextstellen["promptName"].split(" ").join("_")] = answerList
      // console.log("textstelle_" + promptTextstellen["promptName"].split(" ").join("_"))
      // console.log("answerList for " + promptTextstellen["promptName"], answerList)
      let allSinglePromptsTemp = { ...allPromptTextstellen, ...contentNew }
      setAllPromptTextstellen(allSinglePromptsTemp)
    }
  }, [promptTextstellen, promptTextstellenReady]);

  // set data ready when all passage answers have been processed
  useEffect(() => {
    // test if all passage answers are ready
    if (allPromptTextstellen !== undefined && !promptTextstellenReady && Object.keys(allPromptTextstellen).includes("textstelle_" + queries[queries.length - 1].split(" ").join("_"))) {
      setPromptTextstellenReady(true)
    }
  }, [allPromptTextstellen])

  // handle scroll in text area
  useEffect(() => {
    if (txtFieldRef.current) {
      txtFieldRef.current.addEventListener("scroll", () => {
        calculateIntersection()
        let p = (txtFieldRef.current.scrollTop / (txtFieldRef.current.scrollHeight - txtFieldRef.current.clientHeight)) * 100
        // let onePx = Math.round(heatmapRef.current.scrollHeight / 100)
        let onePx = 2.4
        if (document.getElementById("heatmap-high-box")) {
          document.getElementById("heatmap-high-box").style.top = (p * onePx) + "px"
        }
      })
    }
  }, [txtFieldRef])

  // create the table containing the properties and the answers of the ai
  function createTable() {
    let table = []

    if (systemStatus === 0) {
      for (let i = 0; i < Object.keys(aiAnswerJson).length; i++) {
        if (!Object.keys(aiAnswerJson)[i].startsWith("textstelle_")) {
          table.push(
            <tr key={i} id={"row-" + i}>
              <td style={{ fontWeight: "bold", fontSize: "1.5vh", verticalAlign: "top" }}>
                <span style={{ backgroundColor: colors[parseInt(i / 2)] }} className={"highlighted prop-" + i + " prop-main-" + i} id={"id-prop-" + i}>
                  {Object.keys(aiAnswerJson)[i].toUpperCase()}
                </span>
                <span> </span>
                <span>
                  <input type="color" value={colors[parseInt(i / 2)]} style={{ width: "3vw", height: "2.5vh", verticalAlign: "middle", padding: 1 }} onChange={(e) => { let theColors = [...colors]; theColors[parseInt(i / 2)] = e.target.value; setColors(theColors) }} />
                </span>
              </td>
              {!Array.isArray(aiAnswerJson[Object.keys(aiAnswerJson)[i]]) || aiAnswerJson[Object.keys(aiAnswerJson)[i]].length <= 1 ?
                <td style={{ fontSize: "1.5vh", verticalAlign: "top" }}>
                  <span className={"prop-" + i}>{aiAnswerJson[Object.keys(aiAnswerJson)[i]]}</span>
                </td> :
                <td style={{ fontSize: "1.5vh", verticalAlign: "top" }}>
                  {createList(aiAnswerJson[Object.keys(aiAnswerJson)[i]], i, aiAnswerJson[Object.keys(aiAnswerJson)[i + 1]])}
                </td>
              }
              <td style={{ verticalAlign: "top" }}><ThumbDownIcon style={{ cursor: "pointer", fontSize: "3vh" }} onClick={() => fetchDislikeAnswer(Object.keys(aiAnswerJson)[i])} className="ver-no" /></td>
              <td style={{ verticalAlign: "top" }}><EditIcon style={{ cursor: "pointer", fontSize: "3vh" }} onClick={handleAnswerEdit} className="ver-edit" /></td>
            </tr >
          )
        }
      }
    }
    return <table ref={tableRef}>{table}</table>
  }

  // subfunction to create a list from the JSON-list
  function createList(input, number, textstellen) {
    // console.log("create list input ", input)
    // console.log("textstellen zu input ", textstellen)
    let points = []
    for (let j = 0; j < input.length; j++) {
      if (textstellen) {
        if (j >= textstellen.length) {
          points.push(
            <li key={j + "-list-item"} className={"prop-" + number + " prop-" + number + "-" + textstellen.length}>{input[j]}</li>
          )
        } else {
          points.push(
            <li key={j + "-list-item"} className={"prop-" + number + " prop-" + number + "-" + (j + 1)}>{input[j]}</li>
          )
        }
      } else {
        points.push(
          <li key={j + "-list-item"} className={"prop-" + number}>{input[j]}</li>
        )
      }
    }
    return <ul>{points}</ul>
  }

  // check if input is in json format
  function isJson(input) {
    // match = re.search(r'{.*}', text) # to match anything between curly brackets
    try {
      JSON.parse(input);
    } catch (e) {
      return false;
    }
    return true;
  }

  // create table for selection only
  // TODO adapt to new span system
  function fetchSection() {
    let table = [];

    if (systemStatus === 0) {
      for (let i = 1; i < Object.keys(aiAnswerJson).length; i += 2) {
        if (textSelected.match(aiAnswerJson[Object.keys(aiAnswerJson)[i]].toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) && aiAnswerJson[Object.keys(aiAnswerJson)[i]].length > 0) {
          table.push(
            <tr key={"selected-only-" + i}>
              <td style={{ fontWeight: "bold", fontSize: "2.5vh", verticalAlign: "top" }}>
                <span style={{ backgroundColor: colors[parseInt(i / 2)] }} className="highlighted" id={"prop-" + i - 1}>
                  {Object.keys(aiAnswerJson)[i - 1].toUpperCase()}
                </span>
              </td>
              {!Array.isArray(aiAnswerJson[Object.keys(aiAnswerJson)[i - 1]]) ?
                <td style={{ fontSize: "2.5vh" }}>{aiAnswerJson[Object.keys(aiAnswerJson)[i - 1]]}</td> :
                <td style={{ fontSize: "2.5vh" }}>{createList(aiAnswerJson[Object.keys(aiAnswerJson)[i - 1]])}</td>
              }
            </tr >
          )
        }
      }
    }

    setSelectionOnlyTable(table)
  }

  // handle LOAD TEXT user input
  function handleInputText() {
    let dialogArea = []
    dialogArea.push(<span>Input Text</span>)
    setDialogTitle(dialogArea)
    let textArea = []
    textArea.push(<textarea style={{ width: "100%", height: "50vh" }} />)
    setDialogContent(textArea)
    let actions = []
    actions.push(<button onClick={(e) => uploadText(e.currentTarget.parentElement.parentElement.children[1].children[0].value)}>Submit</button>)
    setDialogActions(actions)
    setShowDialog(true);
  }

  // handle CUSTOM PROMPT user input
  function handleCustomPrompt() {
    let dialogArea = []
    dialogArea.push(<span><SearchIcon /> Custom Prompt</span>)
    setDialogTitle(dialogArea)
    let textArea = []
    textArea.push(<textarea style={{ width: "100%", height: "50vh" }} />)
    setDialogContent(textArea)
    let actions = []
    actions.push(<button onClick={(e) => setCustomPrompt(e.currentTarget.parentElement.parentElement.children[1].children[0].value)}>Submit</button>)
    setDialogActions(actions)
    setShowDialog(true);
  }

  // handle user clicking on edit (pencil) button in table
  function handleAnswerEdit() {
    let dialogArea = []
    dialogArea.push(<span><AutoFixHighIcon /> Edit response in property</span>)
    setDialogTitle(dialogArea)
    let textArea = []
    textArea.push(<span>Specify which property you want to edit and specify the problem in the message.</span>)
    textArea.push(<textarea style={{ width: "100%", height: "50vh" }} />)
    setDialogContent(textArea)
    let actions = []
    actions.push(<button onClick={(e) => setEditPrompt(e.currentTarget.parentElement.parentElement.children[1].children[1].value)}>Submit</button>)
    setDialogActions(actions)
    setShowDialog(true);
  }

  // handle text import
  function uploadText(text) {
    let allTextDataTemp = allTextData
    allTextDataTemp.push({ ID: textIndex, Text: text, Status: "", StatusIcon: "" })
    setTextIndex(textIndex + 1)
    setAllTextData(allTextDataTemp)

    let allAiAnswersTemp = allAiAnswers
    allAiAnswersTemp.push({ ID: textIndex, Answer: "" })
    setAllAiAnswers(allAiAnswersTemp)

    setTextData(text);
    setTextDataReady(true);
    console.log("Success (TEXT UPLOADED):", text);
  }

  // save current answer for later use
  function saveCurrentAnswer() {
    let aiAnswerList = [...aiAnswerOld, aiAnswer]
    setAiAnswerOld(aiAnswerList)
    let aiAinswerUncleanedList = [...aiAnswerUncleanedOld, aiAnswerUncleaned]
    setAiAnswerUncleanedOld(aiAinswerUncleanedList)
    let aiAnswerJsonList = [...aiAnswerJsonOld, aiAnswerJson]
    setAiAnswerJsonOld(aiAnswerJsonList)
    setAiAnswerSaved(true)
  }

  // revert to old answer
  function handleRevert() {
    if (aiAnswerOld.length === 1) {
      setAiAnswerSaved(false)
    }

    setAiAnswer(aiAnswerOld[aiAnswerOld.length - 1])
    let aiAnswerList = aiAnswerOld
    aiAnswerList.pop()
    setAiAnswerOld(aiAnswerList)

    setAiAnswerUncleaned(aiAnswerUncleaned[aiAnswerUncleaned.length - 1])
    let aiAnswerUncleanedList = aiAnswerUncleanedOld
    aiAnswerUncleanedList.pop()
    setAiAnswerUncleanedOld(aiAnswerUncleanedList)

    setAiAnswerJson(aiAnswerJsonOld[aiAnswerJsonOld.length - 1])
    let aiAnswerJsonList = aiAnswerJsonOld
    aiAnswerJsonList.pop()
    setAiAnswerJsonOld(aiAnswerJsonList)
  }

  // format ai answer into proper format
  // expects a list with - as first character for each point
  function handleListFormating(input) {
    let list = input.split('\n').map((item) => {
      let sItem = item.trim()
      if (sItem.startsWith("-")) {
        return sItem.substring(1).trim()
      } else if (sItem.startsWith('"') || sItem.startsWith("'")) {
        return sItem.substring(1, sItem.length - 1).trim()
      }
      else {
        console.log("(!) item", item)
        let itemList = []
        itemList.push(item)
        return itemList
      }
    }).filter(item => item !== null)

    return list
  }

  // get the passages from the ai answer between the brackets [[ ]]
  function handleArrayFormating(input) {
    console.log("handleArrayFormating input", input)
    console.log(input.match(/\[\[(.*?)\]\]/g))
    let result = []

    try {
      result = JSON.parse(input)
      console.log("SUCCESS RESULT", result)
    } catch (e) {
      result = [[]]
      console.error("ERROR PARSING INPUT", e)
    }

    return result
  }

  // scroll to specific row in table
  function scrollToTable(e) {
    // console.log("SCROLL TRIGGERED")
    let row = tableRef.current.querySelector(`.prop-${e}`)
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  // scroll to specific passage in text
  function scrollToTextPassage(e) {
    let passage = e
    if (passage) {
      passage.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  // handle drawing heatmap
  const drawHeatmap = svg => {
    console.log("DRAWING HEATMAP")

    // reset before redrawing
    svg.selectAll("*").remove()

    // select heatmap container and text field
    let heatmapContainer = document.getElementById("heatmap-container")
    let txtField = document.getElementById("txt-field")

    let margin = { top: 10, bottom: 10, left: 10, right: 20 }

    // width of the heatmap container/area
    let width = heatmapContainer.offsetWidth - margin.left - margin.right - 10

    // specify number of columns and rows
    let numColumns = 20
    let numRows = Math.ceil(Object.keys(replacedTextStyleGlobal).length / numColumns)

    // specify cell width and height
    let cellWidth = width / numColumns
    let cellHeight = 5

    // specify the padding between the cells horizontally or vertically
    let cellPaddingWidth = 1
    let cellPaddingHeight = 2

    // calculate needed height of svg
    let height = numRows * (cellHeight + cellPaddingHeight)

    // let textDataSplitLength = textData.split(/\s+/).map((x) => {
    //   return x.length
    // })

    // append svg and specify width and height
    let main = svg.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

    // enter style data stored in replacedTextStyleGlobal (data looks like [[style_info_word_1], [style_info_word_2], ...])
    let nodes = main.selectAll(".rect")
      .data(Object.keys(replacedTextStyleGlobal))
      .enter()
      .append("g")

    // add all rectangles with the appropriate style
    nodes.append("rect")
      .attr("width", (d, i) => {
        if ((i + 1) < replacedTextStyleGlobal.length && replacedTextStyleGlobal[i].sort().toString() === replacedTextStyleGlobal[i + 1].sort().toString()) {
          return cellWidth + cellPaddingWidth
        }
        return cellWidth
        // return textDataSplitLength[i]
      })
      .attr("height", cellHeight)
      .attr("x", (d, i) => { return (i % numColumns) * (cellWidth + cellPaddingWidth) })
      .attr("y", (d, i) => { return Math.floor(i / numColumns) * (cellHeight + cellPaddingHeight) })
      .attr("id", (d, i) => { return "rect-" + i })
      .attr("fill", (d) => {
        // for multiple colors we need to define gradients
        if (replacedTextStyleGlobal[d].length > 1) {
          // linear gradient from top to bottom y1 -> y2
          let gradient = main.append("defs")
            .append("linearGradient")
            .attr("id", "gradient-" + d)
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%")

          let step = 100 / (replacedTextStyleGlobal[d].length - 1)

          replacedTextStyleGlobal[d].forEach((color, i) => {
            gradient.append("stop")
              .attr("offset", i * step + "%")
              .style("stop-color", color)
          })
          return "url(#gradient-" + d + ")";
        } else if (replacedTextStyleGlobal[d].length === 1) {
          // returning color is enough for one color
          return replacedTextStyleGlobal[d]
        } else {
          // words with no style specifications
          return "lightgray"
        }
      })
      .attr("opacity", (d) => {
        // words with no style specifications
        if (replacedTextStyleGlobal[d].length === 0) {
          return 0.3
        }
      })
      .attr("class", (d) => { return replacedTextHighlightsGlobal[d] })
      .attr("cursor", "pointer")
      .on("click", (d, i) => {
        // handle scrolling to text position when clicking on rect
        let targetElement = txtField.querySelector(`[key*="${i}"]`)
        scrollToTextPassage(targetElement)
      })
  }

  return (
    <div className="app">
      <Grid container>
        <Grid container>
          <Dialog open={showDialog} onClose={() => setShowDialog(false)} fullWidth maxWidth="lg">
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogContent>{dialogContent}</DialogContent>
            <DialogActions>{dialogActions}</DialogActions>
          </Dialog>
          <Grid item xs={12} style={{ backgroundColor: "#1E1E1E", color: "white", height: "4vh" }}>
            <span style={{ paddingLeft: 10, fontSize: "3vh", float: "left", fontWeight: "bold" }}>
              KI-unterstützte, visuelle Exploration und Verifikation von Ereignissen in Biographien
            </span>
          </Grid>
          <Grid container style={{ paddingLeft: 5, paddirequierngRight: 5 }}>
            {drawerOpen &&
              <Slide in={drawerOpen} direction="right">
                <Grid item xs={drawerOpen ? 3 : 0} style={{ paddingTop: 5 }}>
                  <Grid container style={{ height: "95vh" }}>
                    <Grid item xs={12} style={{ height: "30vh", width: "100%" }}>
                      <span className="ag-theme-alpine" style={{ height: "100%", width: "100%" }}>
                        <AgGridReact
                          gridOptions={{
                            onFirstDataRendered: (e) => {
                              e.api.sizeColumnsToFit()
                            }
                          }}
                          ref={gridRef}
                          rowData={allTextData}
                          columnDefs={textDataColumns}
                          animateRows={true}
                          rowModelType="clientSide"
                          getRowHeight="30"
                          headerHeight="30"
                          pagination={true}
                        />
                      </span>
                    </Grid>
                    <Grid item xs={12} style={{ maxHeight: "65vh", overflow: "scroll" }}>
                      <Paper variant="outlined">
                        <table className="settings-table">
                          <tbody>
                            <tr>
                              <td className="custom-button" onClick={() => { setShowOverview(!showOverview) }} style={{ backgroundColor: "cornflowerblue" }}>
                                <WebIcon sx={{ fontSize: "1.5vh" }} /> <span>{showOverview ? "HIDE" : "SHOW"} OVERVIEW</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="custom-button" onClick={handleInputText}>
                                <FileUploadIcon sx={{ fontSize: "1.5vh" }} /> <span>LOAD TEXT</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="custom-button" onClick={handleCustomPrompt}>
                                <SearchIcon sx={{ fontSize: "1.5vh" }} /> <span>CUSTOM PROMPT</span>
                              </td>
                            </tr>
                            {(textSelected.length > 0 && aiAnswerReady) &&
                              <tr>
                                <td className="custom-button" onClick={fetchSection}>
                                  <ManageSearchIcon sx={{ fontSize: "1.5vh" }} /> <span>ONLY CONSIDER SELECTED</span>
                                </td>
                              </tr>}
                            <tr>
                              <td className="custom-button" onClick={fetchAnswer} style={{ backgroundColor: "limegreen" }}>
                                <SmartToyIcon sx={{ fontSize: "1.5vh" }} /> <span>FETCH ANSWER (ONE PROMPT)</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="custom-button" onClick={handleFetchAnswerProperty} style={{ backgroundColor: "limegreen" }}>
                                <SmartToyIcon sx={{ fontSize: "1.5vh" }} /><SmartToyIcon sx={{ fontSize: "1vh" }} /><SmartToyIcon sx={{ fontSize: "1vh" }} /><SmartToyIcon sx={{ fontSize: "1vh" }} /> <span>FETCH ANSWER (BUILD JSON)</span>
                              </td>
                            </tr>
                            {allSinglePrompts && aiAnswerReady &&
                              <tr>
                                <td className="custom-button" onClick={handleFetchPassages} style={{ backgroundColor: "limegreen" }}>
                                  <b><i>TXT</i></b> <span>FIND PASSAGES</span>
                                </td>
                              </tr>}
                            <tr>
                              <td className="custom-button" onClick={loadSample} style={{ backgroundColor: "orange" }}>
                                <span>LOAD SAMPLE ANSWER #1</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="custom-button" onClick={loadSample2} style={{ backgroundColor: "orange" }}>
                                <span>LOAD SAMPLE ANSWER #2</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="custom-button" onClick={downloadAnswer} style={{ backgroundColor: "cornflowerblue" }}>
                                <DownloadIcon sx={{ fontSize: "1.5vh", marginBottom: "-0.25vh" }} /> <span>DOWNLOAD ANSWER (JSON-TXT)</span>
                              </td>
                            </tr>
                            <tr>
                              <Paper variant="outlined">
                                <td>
                                  <FormatSizeIcon sx={{ fontSize: "1.5vh" }} /> <b>CURRENT TEXT ID </b><span> {currentTextIndex}</span>
                                </td>
                              </Paper>
                            </tr>
                            <tr>
                              <Paper variant="outlined">
                                <td>
                                  <PointOfSaleIcon sx={{ fontSize: "1.5vh" }} /> <b>SYSTEM STATUS </b><span style={{ display: "inline-block", width: "1vh", height: "1vh", backgroundColor: systemStatus === 1 ? "red" : "lime" }}></span><span> {statusName[systemStatus].toUpperCase()} ({systemStatus})</span>
                                </td>
                              </Paper>
                            </tr>
                            <tr>
                              <Paper variant="outlined">
                                <td>
                                  <SmartToyIcon sx={{ fontSize: "1.5vh" }} /> <b> AI STATUS </b><span style={{ display: "inline-block", width: "1vh", height: "1vh", backgroundColor: aiStatus === "loading" ? "gray" : aiStatus === "stop" ? "lime" : aiStatus === "idle" ? "black" : "red" }}></span><span> {aiStatus === "loading" ? <span><CircularProgress size="1vh" sx={{ color: "gray" }} /> <span>LOADING</span></span> : aiStatus === "stop" ? <span><CheckIcon sx={{ color: "lime", fontSize: "2vh", padding: 0, marginBottom: "-0.5vh" }} /> <span>{aiStatus.toUpperCase()}</span></span> : aiStatus === "idle" ? <span>{aiStatus.toUpperCase()}</span> : <span style={{ color: "red" }}>{aiStatus.toUpperCase()}</span>}</span>
                                </td>
                              </Paper>
                            </tr>
                            {/* <tr>
                              <Paper variant="outlined">
                                <td>
                                  <TaskAltIcon sx={{ fontSize: "1.5vh" }} /> <b> PROGRESS </b>{allSinglePrompts ? <span>{allSinglePrompts.length + "/" + queries.length}</span> : <span></span>}
                                </td>
                              </Paper>
                            </tr> */}
                            <tr>
                              <Paper variant="outlined">
                                <td>
                                  <div>
                                    <DeviceThermostatIcon sx={{ fontSize: "1.5vh" }} /> <b>TEMPERATURE </b><span>{temperature}</span><span> ({temperature <= 0.2 ? "DETERMINISTIC" : temperature <= 0.5 ? "MORE DETERMINISTIC" : temperature <= 0.8 ? "MORE RANDOM" : temperature <= 1.5 ? "RANDOM" : "VERY RANDOM"})</span>
                                  </div>
                                </td>
                              </Paper>
                            </tr>
                            <tr style={{ justifyContent: "center", textAlign: "center" }}>
                              <td>
                                <Slider
                                  sx={{ width: "90%", textAlign: "center", padding: 0 }}
                                  value={temperature}
                                  defaultValue={0}
                                  // valueLabelDisplay="auto"
                                  min={0.0}
                                  max={2.0}
                                  step={0.01}
                                  disabled={aiStatus === "loading"}
                                  onChange={(e, v) => setTemperature(parseFloat(v))}
                                  size="small" />
                              </td>
                            </tr>
                            {aiAnswerReady &&
                              <Paper variant="outlined">
                                <tr>
                                  <td>
                                    <QuestionAnswerIcon sx={{ fontSize: "1.5vh" }} /> <b>AI RESPONSE</b>
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ border: "0.3vh solid gray", padding: "0.4vh" }}>
                                    <span style={{ width: "100%" }}>{aiAnswerUncleaned}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ textAlign: "left" }}>
                                    <CleaningServicesIcon sx={{ fontSize: "1.5vh" }} /> <b>AI RESPONSE CLEANED </b>
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ border: "0.3vh solid gray", padding: "0.4vh" }}>
                                    {<span style={{ width: "100%" }}>{isJson(JSON.stringify(aiAnswerJson)) ? JSON.stringify(aiAnswerJson) : aiAnswerJson}</span>}
                                  </td>
                                </tr>
                              </Paper>}
                          </tbody>
                        </table>
                      </Paper>
                    </Grid>
                  </Grid>
                </Grid>
              </Slide>}
            <Grid item xs={0.1} style={{ backgroundColor: "#d3d3d3aa", cursor: "pointer", textAlign: "center" }} onClick={() => { setDrawerOpen(!drawerOpen) }}>
              <span style={{ position: "relative", top: "50%" }}>
                {drawerOpen ?
                  <NavigateBeforeIcon style={{ height: "2vh", width: "2vh" }} /> :
                  <NavigateNextIcon style={{ height: "2vh", width: "2vh" }} />}
              </span>
            </Grid>
            <Grid item xs={0}></Grid>
            {!showOverview ?
              <>
                <Grid item xs={drawerOpen ? 3.9 : 4} ref={txtFieldRef} zeroMinWidth style={{ height: "95vh", overflowY: "scroll", paddingTop: "0.7vh", paddingRight: "0.7vh", paddingLeft: "0.7vh" }}>
                  <Paper className="txt-field-container" variant="outlined" style={{ padding: 5 }}>
                    <span id="txt-field" className="txt-field" style={{ width: "inherit", fontSize: "2.0vh", display: "inline-block" }} onMouseUp={handleTextSelect}>
                      <>
                        {(textDataReady && !aiAnswerReady) &&
                          <span>
                            {textData}
                          </span>}
                        {(textDataReady && aiAnswerReady) &&
                          <span style={{ display: "block" }} dangerouslySetInnerHTML={{ __html: hightlightedText }} />
                        }
                      </>
                    </span>
                  </Paper>
                </Grid>
                <Grid item xs={0.1}></Grid>
                <Grid item xs={drawerOpen ? 4.7 : 7.7} style={{ overflow: "scroll", height: "95vh" }}>
                  <Grid container direction="column">
                    <Grid xs={12} style={{ display: "flex", justifyContent: "center", height: "45vh", maxHeight: "45vh", overflow: "scroll" }}>
                      {(textSelected.length === 0 || selectionOnlyTable.length === 0) ?
                        <span style={{ fontFamily: "ColfaxAI", marginLeft: "auto", marginRight: "auto" }}>
                          {/* TODO BARCHART BAR CHART */}
                          {/* {aiAnswerReady && queries.map((x, i) => { return <span>{x.toUpperCase() + " (" + aiAnswerJson[x].length + "-" +  aiAnswerJson["textstelle_" + x.split(" ").join("_")].length + ") "}</span> })} */}
                          {aiAnswerReady && createTable()}
                          {aiAnswerSaved && aiAnswerReady && <span className="custom-button" onClick={handleRevert}><HistoryIcon sx={{ fontSize: "2vh" }} /> REVERT ({aiAnswerSaved.length})</span>}
                        </span>
                        :
                        <span style={{ fontFamily: "ColfaxAI", marginLeft: "auto", marginRight: "auto" }}>
                          {aiAnswerReady && selectionOnlyTable}
                        </span>}
                    </Grid>
                    {aiAnswerReady &&
                      <>
                        <Grid xs={12}>
                          <hr />
                        </Grid>
                        <Grid xs={12}>
                          <span> <FingerprintIcon sx={{ fontSize: "3vh", verticalAlign: "middle", scale: relevantProps.length > 0 && "1.2", filter: relevantProps.length > 0 && "drop-shadow(0.1vh 0.1vh 0.2vh gray)" }} /> </span>
                          {relevantProps.map((x) => {
                            if (queries[x / 2]) {
                              return <span><span style={{ backgroundColor: colors[(x / 2)] }}>{queries[x / 2].toUpperCase()}</span> </span>
                            } return <span></span>
                          })}
                        </Grid>
                        <Grid xs={12}>
                          <hr />
                        </Grid>
                      </>}
                    {/* <Grid xs={12} stlye={{ maxHeight: "50vh", overflow: "scroll", whiteSpace: "nowrap" }}>
                      <Paper variant="outlined" style={{ padding: 5, maxHeight: "40vh", overflow: "scroll", fontSize: "0.7vh" }}>
                        {(textDataReady && !aiAnswerReady) ? textData : <span style={{ lineHeight: "2.0vh" }} dangerouslySetInnerHTML={{ __html: hightlightedText }} />}
                      </Paper>
                    </Grid> */}
                    {aiAnswerReady &&
                      <Grid xs={12} id="heatmap-container">
                        <div id="heatmap" ref={heatmapRef} style={{ height: "40vh", overflow: "scroll", position: "absolute" }} />
                        <div id="heatmap-high-box" style={{ height: "5vh", top: "0", backgroundColor: "gray", opacity: "30%", position: "relative", zIndex: "-1" }}></div>
                      </Grid>}
                  </Grid>
                </Grid>
              </>
              :
              <Grid item xs={8} style={{ paddingLeft: 10, paddingTop: 5 }}>
                <Box style={{ display: "flex", flexWrap: "wrap", width: "100%" }}>
                  {overviewView}
                </Box>
              </Grid>}
          </Grid>
        </Grid>
      </Grid>
    </div >
  );
}

export default App;
