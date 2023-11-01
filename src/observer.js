//
export function buildThresholdList(numSteps) {
  const thresholds = [];
  const step = 1 / numSteps;

  for (let i = 0; i <= 1; i += step) {
    thresholds.push(i.toPrecision(2));
  }

  return thresholds;
}

//
export default function createObserver(element, handleIntersect, threshold = 1.0) {
  const options = {
    root: document.getElementById('#scrollable-list'),
    threshold,
  };
  const observer = new IntersectionObserver(handleIntersect, options);

  observer.observe(element);
}
