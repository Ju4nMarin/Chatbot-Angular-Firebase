import { Component, OnInit } from '@angular/core';
import * as OpenAI from 'openai';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-proyecto',
  templateUrl: './proyecto.component.html',
  styleUrls: ['./proyecto.component.css']
})
export class ProyectoComponent implements OnInit {
  conversation: { role: string; content: string }[] = [];
  suggestions: string[] = [];

  constructor(
    private userService: UserService,
    private router: Router
  ) { }

  onClick() {
    this.userService.logout()
      .then(() => {
        this.router.navigate(['/login']);
      })
      .catch(error => console.log(error));

    // Reiniciar la conversación al hacer clic en el botón de cierre de sesión
    this.conversation = [];
    this.suggestions = [];
    this.clearSuggestions();
  }

  async speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }

  async sendMessageToOpenAI(message: string) {
    const configuration = new OpenAI.Configuration({
      apiKey: "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",
    });

    try {
      const openai = new OpenAI.OpenAIApi(configuration);

      // Construye el prompt con la conversación completa
      let prompt = '';
      for (const item of this.conversation) {
        prompt += `${item.role}: ${item.content}\n`;
      }
      prompt += `User: ${message}\n`;

      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        temperature: 1,
        max_tokens: 200,
      });

      const botMessage = response.data.choices[0].text ?? "";
      const cleanBotMessage = this.cleanMessagePrefix(botMessage);

      const chatbotMessage = document.createElement("div");
      chatbotMessage.classList.add("chat-message");
      chatbotMessage.innerHTML = ` <img src="assets/mountro2.PNG">
        <div class="message-bubble">${cleanBotMessage}</div> `;

      const chatbot = document.getElementById("chatbot");
      if (chatbot) {
        chatbot.appendChild(chatbotMessage);
        chatbot.scrollTop = chatbot.scrollHeight;
        const voz = cleanBotMessage?.toString() ?? "";

        if (voz) {
          this.speak(voz);
        }
      }

      // Agregar el mensaje del usuario y el mensaje del bot a la conversación
      this.conversation.push({ role: "user", content: message });
      this.conversation.push({ role: "bot", content: botMessage });

      // Generar sugerencias relacionadas
      const suggestionsResponse = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: "Sugiere una sola pregunta tipo sugerencias para el siguiente texto:"+prompt,
        temperature: 1,
        max_tokens: 60,
        n: 3,
      });

      this.suggestions = suggestionsResponse.data.choices.map((choice: any) => choice.text);

      // Mostrar las sugerencias en el chat si no están vacías
      if (this.suggestions.length > 0) {
        const chatSuggestions = document.createElement("div");
        chatSuggestions.classList.add("chat-suggestions");

        for (const suggestion of this.suggestions) {
          const suggestionElement = document.createElement("div");
          suggestionElement.classList.add("suggestion");
          suggestionElement.innerText = suggestion;
          suggestionElement.addEventListener("click", () => this.onSuggestionClick(suggestion));
          chatSuggestions.appendChild(suggestionElement);
        }

        if (chatbot) {
          chatbot.appendChild(chatSuggestions);
        }
      }

    } catch (error) {
      console.log("Hubo un error: ", error);
    }
  }

  onSuggestionClick(suggestion: string) {
    // Limpiar las sugerencias en el chat
    this.clearSuggestions();

    // Agregar el mensaje de la sugerencia seleccionada al chat
    const chatbot = document.getElementById("chatbot");
    if (chatbot) {
      const userMessageElement = document.createElement("div");
      userMessageElement.classList.add("chat-message2");
      userMessageElement.innerHTML = `
        <div class="message-bubble2">${suggestion}</div>
        <img src="assets/AvatarChico.png">`;

      chatbot.appendChild(userMessageElement);
      chatbot.scrollTop = chatbot.scrollHeight;
    }

    // Enviar la sugerencia seleccionada al bot
    this.sendMessageToOpenAI(suggestion);
  }

  async sendMessageFromUserInput() {
    const userInput = document.getElementById("userInput") as HTMLInputElement;
    const alert1 = document.getElementById("alert1");

    if (userInput.value == "" || userInput.value == "null" || userInput.value == "undefined") {
      if (alert1) {
        alert1.innerText = "Mensaje Inválido";
        setTimeout(() => { alert1.innerText = ""; }, 3000);
      }
    } else {
      const userMessage = userInput?.value;

      const userMessageElement = document.createElement("div");
      userMessageElement.classList.add("chat-message2");
      userMessageElement.innerHTML = `
        <div class="message-bubble2">${userMessage}</div>
        <img src="assets/AvatarChico.png">`;

      const chatbot = document.getElementById("chatbot");
      if (chatbot) {
        chatbot.appendChild(userMessageElement);
        chatbot.scrollTop = chatbot.scrollHeight;
      }

      this.clearSuggestions();
      this.sendMessageToOpenAI(userMessage);
      userInput.value = "";
    }
  }

  ngOnInit(): void {
    const chatbot = document.getElementById("chatbot");
    const userInput = document.getElementById("userInput") as HTMLInputElement;
    const alert1 = document.getElementById("alert1");
    const sendButton = document.getElementById("sendButton");

    userInput.addEventListener('keypress', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        this.sendMessageFromUserInput();
      }
    });

    sendButton?.addEventListener("click", () => {
      this.sendMessageFromUserInput();
    });
  }

  private clearSuggestions() {
    const chatSuggestions = document.querySelector(".chat-suggestions");
    if (chatSuggestions) {
      chatSuggestions.remove();
    }

    this.suggestions = [];
  }

  private cleanMessagePrefix(message: string): string {
    const prefixes = ["Bot:", "Computer:"];
    let cleanMessage = message;

    for (const prefix of prefixes) {
      if (cleanMessage.startsWith(prefix)) {
        cleanMessage = cleanMessage.substring(prefix.length).trim();
      }
    }

    return cleanMessage;
  }
}
