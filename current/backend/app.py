from flask import Flask, request
import json
import openai
from os.path import join, dirname, realpath

"""
    >>>###############################################################################################<<<
    PLACE YOUR OPENAI API KEY IN A FILE CALLED "openai_api_key.txt" INTO THE CURRENT DIRECTORY ("backend")
    >>>###############################################################################################<<<
"""

# app runs on localhost:5000, react-app listens to this port
# can be configured in ../frontend/package.json under 'proxy'
app = Flask(__name__)

# name of the text file
file_name = "input.txt"
# openai model, see https://platform.openai.com/docs/models/
model = "gpt-4"


@app.route("/")
# load start screen
def start():
    print("BACKEND RUNNING")
    print('PLEASE START THE FRONTEND (DIRECTORY "/frontend") WITH npm start AND GO TO localhost:3000')
    return "<span>DO <i><b>npm start</b></i> IN THE <i>/frontend</i> DIRECTORY AND GO TO <a href='http://localhost:3000'>localhost:3000</a></span>"


@app.route("/get_text", methods=["POST"])
# load and return text data (biography text) from file
def get_text():
    # read input text file
    print("> READING INPUT FILE")

    # the input text is stored in file_name
    file_name = "input.txt"
    file_path = join(dirname(realpath(__file__)), file_name)

    with open(file_path, encoding="utf-8") as f:
        data = f.read()

    # make text data globally available
    global text_data
    text_data = data

    # save the text as JSON in json_data
    json_data = json.dumps(text_data)
    print("< READING DONE")

    # load api key from file
    global openai_api_key
    try:
        print("> READING API KEY")
        # get OpenAI api key from the 'openai_api_key.txt' file
        with open(join(dirname(realpath(__file__)), "openai_api_key.txt")) as f:
            openai_api_key_line = f.read()
        openai_api_key = openai_api_key_line.rstrip()
        openai.api_key = openai_api_key
        print("SUCCESS (API KEY): API KEY LOADED")
        print("< READING API KEY DONE")
    except FileNotFoundError:
        print("ERROR (API KEY) 'openai_api_key.txt' NOT FOUND")
    except Exception as e:
        print("ERROR (API KEY): ", e)
    return json_data


@app.route("/get_answer", methods=["POST"])
# prompt ai for ALL properties in the text and get all properties as JSON Format as one
def get_answer():
    temperature = request.get_json()["temperature"]
    temperature = float(temperature)

    print("> PROCESSING PROMPT...")
    print("TEMPERATURE SET TO " + str(temperature))

    # see https://platform.openai.com/docs/api-reference/chat/create
    response = openai.ChatCompletion.create(
        model=model,
        # role is one of system, user, assistant, or function
        messages=[{'role': 'user', 'content': getPrompt(text_data)}],
        temperature=temperature,  # 0 <-- deterministic
    )

    # save response as json in json_response
    json_response = json.dumps(response)
    # actual result is stored in response['choices'][0]['message']['content']
    print("< PROCESSING DONE")
    return json_response


@app.route("/get_dislike_answer", methods=["POST"])
# process the disliked property
def get_dislike_answer():
    dislike_name = request.get_json()["dislike_name"]
    temperature = request.get_json()["temperature"]
    temperature = float(temperature)
    textData = request.get_json()["textData"]
    aiAnswerJson = request.get_json()["aiAnswerJson"]

    print("> PROCESSING " + dislike_name + " AGAIN")
    print("TEMPERATURE SET TO " + str(temperature))

    response = openai.ChatCompletion.create(
        model=model,
        messages=[{'role': 'assistant', 'content': "Du hast folgenden Eingabe vom Nutzer bekommen: ### Finde den Namen, Geburtsdatum, Sterbedatum, familiäre Ereignisse und schöpferische Akte in folgendem Text und gebe dies im JSON-Format aus. Gebe auch aus, aus welchen Textstellen diese Antworten folgen. Die Ausgabe soll folgendermaßen aussehen: " + getFormat() + ". Text: " + str(textData) + " ### " + " und hast folgende Ausgabe gemacht: " + str(aiAnswerJson)},
                  {'role': 'user', 'content': getDislikePrompt(dislike_name)}],
        temperature=temperature,
    )

    # save response as json in json_response
    json_response = json.dumps(response)
    print("< PROCESSING " + dislike_name + " DONE")
    return json_response


@app.route("/get_edit_answer", methods=["POST"])
# process the edited property
def get_edit_answer():
    prompt = request.get_json()["prompt"]
    temperature = request.get_json()["temperature"]
    temperature = float(temperature)
    textData = request.get_json()["textData"]
    aiAnswerJson = request.get_json()["aiAnswerJson"]

    print("> PROCESSING " + str(prompt))
    print("TEMPERATURE SET TO " + str(temperature))

    response = openai.ChatCompletion.create(
        model=model,
        messages=[{'role': 'assistant', 'content': "Du hast folgenden Eingabe vom Nutzer bekommen: ### Finde den Namen, Geburtsdatum, Sterbedatum, familiäre Ereignisse und schöpferische Akte in folgendem Text und gebe dies im JSON-Format aus. Gebe auch aus, aus welchen Textstellen diese Antworten folgen. Die Ausgabe soll folgendermaßen aussehen: " + getFormat() + ". Text: " + str(textData) + " ### und hast folgende Ausgabe gemacht: " + str(aiAnswerJson)},
                  {'role': 'user', 'content': str(prompt)}],
        temperature=temperature,
    )

    # result = response['choices'][0]['message']['content']
    # save response as json in json_response
    json_response = json.dumps(response)
    print("< PROCESSING EDIT DONE")
    return json_response


@ app.route("/get_custom_prompt", methods=["POST"])
# process custom prompts from the frontend
def get_custom_prompt():
    prompt = request.get_json()["prompt"]
    temperature = request.get_json()["temperature"]
    temperature = float(temperature)

    print("> PROCESSING CUSTOM PROMPT...")
    print("TEMPERATURE SET TO " + str(temperature))
    print("PROMPT: " + str(prompt))

    response = openai.ChatCompletion.create(
        model=model,
        messages=[{'role': 'user', 'content': str(prompt)}],
        temperature=temperature,
    )

    # save response as json in json_response
    json_response = json.dumps(response)
    print("< PROCESSING CUSTOM PROMPT DONE")
    return json_response


@ app.route("/get_answer_property", methods=["POST"])
# get answer for a single property specified with prop
def get_answer_property():
    prop = request.get_json()["prop"]
    textData = request.get_json()["textData"]
    temperature = request.get_json()["temperature"]
    temperature = float(temperature)

    print("> PROCESSING PROMPT WITH PROPERTY " + prop + "...")
    print("TEMPERATURE SET TO " + str(temperature))

    response = openai.ChatCompletion.create(
        model=model,
        messages=[{'role': 'user', 'content': "Finde " +
                   str(prop) + " in folgendem Text (Biogrpahie) und gebe deine Antwort als Liste mit Bindestrichen (-) an ohne Bindestrich, falls es sich um einen Punkt handelt: " + str(textData) + "\n " + str(prop) + ": \n"}],
        temperature=temperature,
    )

    # save response as json in json_response
    json_response = json.dumps(response)
    print("< PROCESSING PROPERTY DONE")
    return json_response


@ app.route("/get_passage", methods=["POST"])
# get text passages where answers are located in specific format
def get_passage():
    answer = request.get_json()["answer"]
    textData = request.get_json()["textData"]
    prop = request.get_json()["prop"]
    temperature = request.get_json()["temperature"]
    temperature = float(temperature)

    print("> FINDING PASSAGE IN TEXT...")
    print("TEMPERATURE SET TO " + str(temperature))

    output_string = str(prop) + ": "
    for i, item in enumerate(answer, start=1):
        output_string += str(i) + "" + str(item) + ", "

    answer_string = str(output_string)
    # TODO testing answer list
    # print("ANSWER LIST: " + answer_string)

    answer_length = str(len(answer))

    response = openai.ChatCompletion.create(
        model=model,
        messages=[{'role': 'assistant', 'content': ''''Du bekommst einen Text und Informationen (info_kategorie: 1. erste_info, 2. zweite_info, ..., n: nte_info), die aus dem Text extrahiert wurden.
                Du sollt ein Array erstellen in dem ''' + answer_length + ''' weitere Arrays enthalten sind.
                Diese Arrays enthalten Strings. Jedes Array soll die Textstellen enthalten, aus denen die Informationen gefolgert werden können.
                   Das ausgegebene Array sollte das folgende Format haben: \\n
                   [["<textstelle_zu_erste_info_1>, <textstelle_zu_erste_info_2>, ...], [<textstelle_zu_zweite_info_1>, <textstelle_zu_zweite_info_2>, ...], ..., [<textstelle_zu_nte_info_1>, <textstelle_zu_nte_info_2>, ...]].
                   Die länge des Arrays beträgt also ''' + answer_length + ''' d.h. : [["textstelle_zu_erste_info_1, textstelle_zu_erste_info_2, ...], [textstelle_zu_zweite_info_1, textstelle_zu_zweite_info_2, ...], ..., [textstelle_zu_nte_info_1, textstelle_zu_nte_info_2, ...]].length''' + answer_length + '''.'''},
                  {'role': 'user', 'content': '''Aus diesem Text: \\n ### \\n''' + str(textData) + '''### \\n wurden folgende Informationen extrahiert: \\n Informationen: ''' + answer_string + '''\\n
                    Gebe zu jedem Punkt die exakten Textstellen als Array von Strings in einem Array an, aus denen die Informationen jeweils folgen. \\n
                    Beispiel: \\n
                    Text: Klimt Gustav, Maler. Geb. 14.7.1862. Er war ein bekannter Maler. Seine künstlierischen Werke waren zu seiner Zeit sehr beliebt. \\n
                    Informationen: schöpferische Akte: 1. Gustav Klimt, 2. Geboren am 14. Juli 1862, 3. Maler, 4. Seine Werke waren beliebt \\n
                    Ausgabe: [["Klimt Gustav"], ["Geb. 14.7.1862"], ["Maler", "Er war ein bekannter Maler", "künstlerische Werke"], ["Seine künstlierischen Werke waren zu seiner Zeit sehr beliebt"]] \\n
                    Achte darauf, dass das Hauptarray exakt ''' + answer_length + ''' Arrays enthält. Die Strings sind die exakten Textstellen ohne extra Text/Zeichen davor und danach. Nutze das vorher gennante Format, also: \\n
                    [["<textstelle_zu_erste_info_1>, <textstelle_zu_erste_info_2>, ...], [<textstelle_zu_zweite_info_1>, <textstelle_zu_zweite_info_2>, ...], ..., [<textstelle_zu_nte_info_1>, <textstelle_zu_nte_info_2>, ...]] \\n
                    Ausgabe: \\n'''}],
        temperature=temperature,
    )

    # save response as json in json_response
    json_response = json.dumps(response)
    print("< FINDING PASSAGE IN TEXT DONE")
    return json_response


def getPrompt(input):
    # create prompt for the text input
    return "Finde den Namen, Geburtsdatum, Sterbedatum, familiäre Ereignisse und schöpferische Akte in folgendem Text und gebe dies im JSON-Format aus. Gebe auch aus, aus welchen Textstellen diese Antworten folgen. Die Ausgabe soll folgendermaßen aussehen: " + getFormat() + ". Text: " + str(input)


def getDislikePrompt(input):
    # create a dislike prompt for the users choice
    return "Mir gefällt die Antwort für " + str(input) + " nicht. Verbessere deine letzte Antwort und gebe dies wieder im genannten JSON-Format aus."


def getFormat():
    # create prompt for all-in-one answer
    return """{"Name": <antwort_name>, "textstelle_name": <Textstellen aus der Name folgt als Liste>,
            "Geburtsdatum": <antwort_geburtsdatum im Format dd.mm.yyyy sonst mm.yyyy sonst yyyy>, "textstelle_geburtsdatum": <Textstellen aus der Geburtsdatum folgt als Liste>,
            "Sterbedatum":  <antwort_sterbedatum im Format dd.mm.yyyy sonst mm.yyyy sonst yyyy>, "textstelle_sterbedatum": <Textstellen aus der Sterbedatum folgt als Liste>,
            "familiäre Ereignisse": <antwort_familiäre_ereignisse als Liste>, "textstelle_familiäre_ereignisse": <Textstellen aus der familiäre Ereignisse folgen als Liste>,
            "Schöpferische Akte": <antwort_schöpferische_akte als Liste>, "textstelle_schöpferische_akte": <Textstellen aus der Schöpferische Akte folgen als Liste>}"""


if __name__ == "__main__":
    app.run()
