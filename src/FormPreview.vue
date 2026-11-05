<script setup lang="ts">
/**
 * Simulación de solo lectura del formulario que se va a generar.
 *
 * No crea nada ni envía datos: muestra los enunciados del catálogo tal y
 * como los vería quien responde, para que el gestor pueda revisarlos antes
 * de generar el cuestionario.
 */

import { computed } from "vue";
import { texts } from "./texts";

type PreviewQuestion = {
  code: string;
  statement: string;
};

type PreviewDimension = {
  id: string;
  name: string;
  description: string;
  questions: PreviewQuestion[];
};

type PreviewAxis = {
  id: string;
  name: string;
  description: string;
  values: string[];
};

const props = defineProps<{
  title: string;
  dimensions: PreviewDimension[];
  axes: PreviewAxis[];
}>();

const SCALE = [1, 2, 3, 4, 5];

const questionCount = computed(() =>
  props.dimensions.reduce(
    (total, dimension) => total + dimension.questions.length,
    0,
  ),
);

const valueLabel = (axis: string, value: string) =>
  texts.labels[`${axis}=${value}`] ?? value;
</script>

<template>
  <aside class="form-preview" :aria-label="texts.instruments.preview.title">
    <div class="form-preview-bar">
      <span class="preview-badge">{{ texts.instruments.preview.title }}</span>
      <p class="preview-note">{{ texts.instruments.preview.note }}</p>
    </div>

    <div class="form-sheet">
      <header class="form-sheet-head">
        <h2 :class="{ placeholder: !title.trim() }">
          {{ title.trim() || texts.instruments.preview.untitled }}
        </h2>
        <p class="form-sheet-meta">
          {{ texts.instruments.preview.anonymous }} ·
          {{ texts.instruments.questions(questionCount) }}
        </p>
        <p class="form-sheet-intro">{{ texts.instruments.preview.intro }}</p>
      </header>

      <section
        v-for="axis in axes"
        :key="axis.id"
        class="form-question"
        :aria-labelledby="`preview-axis-${axis.id}`"
      >
        <p :id="`preview-axis-${axis.id}`" class="form-question-title">
          {{ axis.description }}
          <span class="form-required" aria-hidden="true">*</span>
          <span class="sr-only">{{ texts.instruments.preview.required }}</span>
        </p>

        <ul class="form-options">
          <li v-for="value in axis.values" :key="value" class="form-option">
            <span class="form-radio" aria-hidden="true"></span>
            <span>{{ valueLabel(axis.id, value) }}</span>
          </li>
        </ul>
      </section>

      <p v-if="dimensions.length === 0" class="form-sheet-empty">
        {{ texts.instruments.preview.empty }}
      </p>

      <section
        v-for="dimension in dimensions"
        :key="dimension.id"
        class="form-section"
        :aria-labelledby="`preview-section-${dimension.id}`"
      >
        <header class="form-section-head">
          <h3 :id="`preview-section-${dimension.id}`">
            {{ dimension.name }}
          </h3>
          <p>{{ dimension.description }}</p>
        </header>

        <div
          v-for="question in dimension.questions"
          :key="question.code"
          class="form-question"
        >
          <p class="form-question-title">
            {{ question.statement }}
            <span class="form-required" aria-hidden="true">*</span>
            <span class="sr-only">{{ texts.instruments.preview.required }}</span>
          </p>

          <div class="form-scale" aria-hidden="true">
            <div
              v-for="value in SCALE"
              :key="value"
              class="form-scale-point"
            >
              <span class="form-radio"></span>
              <span class="form-scale-number">{{ value }}</span>
            </div>
          </div>
          <p class="sr-only">
            Escala de 1 a 5, de {{ texts.instruments.preview.scaleLow }} a
            {{ texts.instruments.preview.scaleHigh }}.
          </p>

          <div class="form-scale-labels" aria-hidden="true">
            <span>{{ texts.instruments.preview.scaleLow }}</span>
            <span>{{ texts.instruments.preview.scaleHigh }}</span>
          </div>
        </div>
      </section>
    </div>
  </aside>
</template>
