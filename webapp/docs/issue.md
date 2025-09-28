> OK I want you to really look at the regeneration button when I press regenerate as you can see I see I get to choose my prompt right and I get 
to add my context to the prompt which is amazing It's wonderful the context choice is like the context when I add a context to the prompt to the 
default prompts it's amazing and if even if I don't pick a context if I just regenerate with the default prompt it's working and it's fantastic 
however here's the joke here's the thing here's the problem when I pick a new prompt of my new prompts OK the ones that I created unfortunately 
nothing happens it goes it says generation It's keeps saying generation generation generation generating generating generating and then never 
nothing happens I see nothing updates it just stops and nothing happens so I think there's something missing in the loop and this big loop there's
 something that is not allowing me to generate as much as I want what do you think is this thing? It just I noticed something it just generates a 
new actually no no it generates and it generates only a default thing so the the the the only using the default only using the default prompt so 
no matter if I choose it or not it always use the default one  So I tried I picked the new prompt it doesn't matter it doesn't work unfortunately 
like it really really doesn't work What do you think can you just investigate it don't don't solve right now just think very hardly think very 
deeply Think very deep Think very hard because I want you to solve this again the idea is when I press regenerate I should see a picker just like 
I seen right now and it's wonderful the picker works if I add a new context I add if I don't I don't But again I realize like if I pick the new 
prompts that I created those prompts don't work unfortunately they just generate the like the generation that happens comes from the default so 
they always point to the default how do you think we should replace it like in the back end there should be a replacement right it should replace 
the old prompt and replace it with a new selected prompt this is the idea that I'm picking that's why I put the new page that's called prompts 
because I want I want people to generate their own prompts their own specialized prompts they just want to use those prompts because they are 
thinking like yeah I have you know an idea II don't want to be already used one by the like whoever doing this I want to use my my my special 
prompt why this is not happening , dont fix now, just find the problem, for ex this is what i see gets callled when i press regenrate and i press 
my own promt not hte dufult one, await in fetchServerAction        
generateSessionArtifactsAction    @    generation.ts:14
SessionList.useCallback[regenerateHomework]    @    C:\Users\Alaa M. Jaish\Desktop\Programming\Agentic_JOURNEY\cc\windsurf-clau…y 
(2)\webapp\src\app\(dashboard)\recordings\components\SessionList.tsx:156
SessionList.useCallback[handleGenerateWithContext]    @    C:\Users\Alaa M. Jaish\Desktop\Programming\Agentic_JOURNEY\cc\windsurf-clau…y 
(2)\webapp\src\app\(dashboard)\recordings\components\SessionList.tsx:186
handleGenerate    @    C:\Users\Alaa M. Jaish\Desktop\Programming\Agentic_JOURNEY\cc\windsurf-clau…y 
(2)\webapp\src\app\(dashboard)\recordings\components\ContextModal.tsx:23
<button>        
ContextModal    @    C:\Users\Alaa M. Jaish\Desktop\Programming\Agentic_JOURNEY\cc\windsurf-clau… 
(2)\webapp\src\app\(dashboard)\recordings\components\ContextModal.tsx:150
 ? what do you thikn? dont code, just find the issue, andd give hte investigaton!
