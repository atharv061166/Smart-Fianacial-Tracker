#include <stdio.h>
#include <pthread.h>
#include <string.h>

#define STR "GvMRyiZl"

void* print_letter(void* arg) {
    char letter = *(char*)arg;
    printf("%c\n", letter);
    return NULL;
}

int main() {
    pthread_t threads[strlen(STR)];
    char letters[strlen(STR)];
    int i;

    for(i = 0; i < strlen(STR); i++) {
        letters[i] = STR[i];  // copy character
        pthread_create(&threads[i], NULL, print_letter, &letters[i]);
    }

    // Wait for all threads to finish
    for(i = 0; i < strlen(STR); i++) {
        pthread_join(threads[i], NULL);
    }

    return 0;
}
